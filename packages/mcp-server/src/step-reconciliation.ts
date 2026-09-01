import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants, type BigIntStats } from "node:fs";
import { lstat, open, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import {
  checkStepPacketBudget,
  parsePlanPath,
  revisionCountsDocument,
  type Item,
  type KanmerStore,
  type StepPacketEvidence,
  type StepPacketWorkspace,
  type StepWorkspaceEntry,
  type TicketDocumentWithVersion,
} from "@kanmer/core";

const GIT_TIMEOUT_MS = 15_000;
const WORKSPACE_COLLECTION_TIMEOUT_MS = 30_000;
const GIT_MAX_BUFFER = 2 * 1024 * 1024;
const MAX_ENTRIES = 512;
const MAX_INDEX_FLAG_ENTRIES = 16_384;
const MAX_TRACKED_LINK_ENTRIES = 256;
const MAX_TRACKED_LINK_TEXT_BYTES = 64 * 1024;
const MAX_TRACKED_LINK_TARGET_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function literalPathspec(value: string): string {
  return `:(literal)${value}`;
}

export type StepGitRun = (cwd: string, args: readonly string[]) => Promise<Buffer>;

const defaultRun = (cwd: string, args: readonly string[], timeout: number): Promise<Buffer> => new Promise((resolve, reject) => {
  execFile(
    "git",
    ["--no-optional-locks", "-C", cwd, ...args],
    { encoding: "buffer", windowsHide: true, timeout, maxBuffer: GIT_MAX_BUFFER },
    (error, stdout) => error ? reject(error) : resolve(Buffer.from(stdout)),
  );
});

function deadlineRun(source: StepGitRun | undefined, deadline: number): StepGitRun {
  return async (cwd, args) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("aggregate Git collection deadline exhausted");
    const timeout = Math.max(1, Math.min(GIT_TIMEOUT_MS, remaining));
    return new Promise<Buffer>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("aggregate Git collection deadline exhausted"));
      }, remaining);
      let operation: Promise<Buffer>;
      try {
        operation = source ? source(cwd, args) : defaultRun(cwd, args, timeout);
      } catch (error) {
        settled = true;
        clearTimeout(timer);
        reject(error);
        return;
      }
      operation.then(
        (output) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(output);
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(Date.now() >= deadline ? new Error("aggregate Git collection deadline exhausted") : error);
        },
      );
    });
  };
}

function decode(buffer: Buffer): string {
  return decoder.decode(buffer);
}

function canonicalPath(value: string): string {
  const resolved = path.resolve(value).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

/**
 * A dedicated board checkout protects its complete physical subtree. Legacy
 * boards rooted at the shared source checkout still permit real linked ticket
 * worktrees below that source root; arbitrary children are rejected separately
 * when their Git top-level differs from the recorded path.
 */
export function isProtectedBoardExecutionWorktree(sourceRoot: string, boardRoot: string, candidate: string): boolean {
  const source = canonicalPath(sourceRoot);
  const board = canonicalPath(boardRoot);
  const worktree = canonicalPath(candidate);
  return worktree === board || (board !== source && inside(board, worktree));
}

async function assertPhysicalContainment(root: string, absolute: string): Promise<void> {
  let cursor = absolute;
  for (;;) {
    try {
      const resolved = await realpath(cursor);
      const same = canonicalPath(resolved) === canonicalPath(root);
      if (!same && !inside(root, resolved)) throw new Error(`observed path resolves outside the physical worktree`);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      cursor = parent;
    }
  }
}

function splitNul(raw: Buffer, label: string): Buffer[] {
  if (raw.length === 0) return [];
  if (raw[raw.length - 1] !== 0) throw new Error(`${label} is not terminated by NUL`);
  const tokens: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== 0) continue;
    tokens.push(raw.subarray(start, index));
    start = index + 1;
  }
  return tokens;
}

interface StatusPath {
  path: string;
  index: string;
  worktree: string;
  role: "path" | "rename-source";
}

/** Porcelain v1 -z spells a rename as `XY destination\0source\0`. */
export function parsePorcelainV1Z(raw: Buffer): StatusPath[] {
  const tokens = splitNul(raw, "git status --porcelain=v1 -z output");
  const paths: StatusPath[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.length < 4 || token[2] !== 0x20) throw new Error("git status emitted a malformed porcelain token");
    const left = String.fromCharCode(token[0]);
    const right = String.fromCharCode(token[1]);
    const destination = decode(token.subarray(3));
    paths.push({ path: destination, index: left === " " ? "." : left, worktree: right === " " ? "." : right, role: "path" });
    if (/[RC]/.test(left) || /[RC]/.test(right)) {
      const sourceToken = tokens[++index];
      if (!sourceToken) throw new Error("git status omitted a rename/copy source path");
      paths.push({ path: decode(sourceToken), index: left === " " ? "." : left, worktree: right === " " ? "." : right, role: "rename-source" });
    }
  }
  if (paths.length > MAX_ENTRIES) throw new Error(`workspace has more than ${MAX_ENTRIES} dirty paths`);
  return paths;
}

/** `git diff --name-status -z` spells `status\0old\0new\0` for renames. */
export function parseNameStatusZ(raw: Buffer): string[] {
  const tokens = splitNul(raw, "git diff --name-status -z output");
  const paths: string[] = [];
  for (let index = 0; index < tokens.length;) {
    const status = decode(tokens[index++]);
    if (!/^(?:[ACDMRTUXB]|R\d{1,3}|C\d{1,3})$/.test(status)) throw new Error(`git diff emitted unsupported status ${status}`);
    const first = tokens[index++];
    if (!first) throw new Error("git diff omitted a changed path");
    paths.push(decode(first));
    if (/^[RC]/.test(status)) {
      const second = tokens[index++];
      if (!second) throw new Error("git diff omitted a rename/copy destination");
      paths.push(decode(second));
    }
  }
  if (paths.length > MAX_ENTRIES) throw new Error(`HEAD diff has more than ${MAX_ENTRIES} changed paths`);
  return paths;
}

export interface IndexFlagCensus {
  digest: string;
  count: number;
  assumeUnchanged: string[];
  skipWorktree: string[];
  entries: IndexCensusEntry[];
}

export interface IndexCensusEntry {
  tag: string;
  mode: string;
  objectId: string;
  stage: number;
  path: string;
}

/** Parse the exact raw `git ls-files -v -s -z` tracked-index census. */
export function parseIndexFlagCensus(raw: Buffer): IndexFlagCensus {
  if (raw.length > GIT_MAX_BUFFER) throw new Error(`git ls-files flag census exceeds ${GIT_MAX_BUFFER} bytes`);
  const tokens = splitNul(raw, "git ls-files -v -s -z output");
  if (tokens.length > MAX_INDEX_FLAG_ENTRIES) {
    throw new Error(`git ls-files flag census exceeds ${MAX_INDEX_FLAG_ENTRIES} tracked entries`);
  }
  const assumeUnchanged: string[] = [];
  const skipWorktree: string[] = [];
  const entries: IndexCensusEntry[] = [];
  let trackedLinks = 0;
  for (const token of tokens) {
    const tab = token.indexOf(0x09);
    if (tab < 0) throw new Error("git ls-files emitted a malformed index census token");
    const header = decode(token.subarray(0, tab));
    const match = /^([HSMRCK?]) ([0-9]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])$/i.exec(header);
    if (!match) throw new Error("git ls-files emitted a malformed index census header");
    const [, tag, mode, objectId, stageText] = match;
    const observed = decode(token.subarray(tab + 1));
    if (!observed) throw new Error("git ls-files emitted an empty tracked path");
    const parsed = parsePlanPath(observed, { observed: true });
    if (!parsed.ok || parsed.path !== observed) throw new Error(`git ls-files emitted unsafe tracked path ${JSON.stringify(observed)}`);
    if (/^[a-z]$/.test(tag)) assumeUnchanged.push(observed);
    if (tag === "S" || tag === "s") skipWorktree.push(observed);
    if (mode === "120000") trackedLinks += 1;
    entries.push({ tag, mode, objectId: objectId.toLowerCase(), stage: Number(stageText), path: observed });
  }
  if (trackedLinks > MAX_TRACKED_LINK_ENTRIES) {
    throw new Error(`git ls-files census exceeds ${MAX_TRACKED_LINK_ENTRIES} tracked symbolic links`);
  }
  return {
    digest: createHash("sha256").update(raw).digest("hex"),
    count: tokens.length,
    assumeUnchanged,
    skipWorktree,
    entries,
  };
}

function digest(parts: readonly (string | Buffer)[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    const bytes = typeof part === "string" ? Buffer.from(part, "utf8") : part;
    hash.update(Buffer.from(String(bytes.length), "ascii"));
    hash.update(Buffer.from([0]));
    hash.update(bytes);
  }
  return hash.digest("hex");
}

interface StableFileFacts {
  dev: bigint;
  ino: bigint;
  mode: bigint;
  nlink: bigint;
  size: bigint;
  regular: boolean;
  symbolicLink: boolean;
}

function stableFileFacts(stat: BigIntStats): StableFileFacts {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    size: stat.size,
    regular: stat.isFile(),
    symbolicLink: stat.isSymbolicLink(),
  };
}

function sameFileFacts(left: StableFileFacts, right: StableFileFacts): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode &&
    left.nlink === right.nlink && left.size === right.size && left.regular === right.regular &&
    left.symbolicLink === right.symbolicLink;
}

export interface WorkspaceFileReadHooks {
  beforeOpen?: () => void | Promise<void>;
  afterHandleValidated?: () => void | Promise<void>;
  afterRead?: () => void | Promise<void>;
  afterClose?: () => void | Promise<void>;
}

/**
 * Read one workspace file through the exact handle whose identity was checked.
 * `null` means the path was already absent at the initial sample; every later
 * disappearance, replacement, short read or growth is an inconclusive error.
 */
export async function readBoundedWorkspaceFile(
  root: string,
  absolute: string,
  budget: { total: number },
  hooks: WorkspaceFileReadHooks = {},
  limits: { maxFileBytes: number; maxTotalBytes: number } = {
    maxFileBytes: MAX_FILE_BYTES,
    maxTotalBytes: MAX_TOTAL_FILE_BYTES,
  },
): Promise<{ bytes: Buffer; mode: string } | null> {
  await assertPhysicalContainment(root, absolute);
  let initialStat: BigIntStats;
  try {
    initialStat = await lstat(absolute, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const initial = stableFileFacts(initialStat);
  if (initial.symbolicLink) throw new Error("observed workspace path is a symbolic link");
  if (!initial.regular) throw new Error("observed workspace path is not a regular file");
  if (initial.nlink !== 1n) throw new Error("observed workspace path is hard-linked outside its single workspace identity");
  const remainingTotal = limits.maxTotalBytes - budget.total;
  const allowed = Math.min(limits.maxFileBytes, remainingTotal);
  if (allowed < 0 || initial.size > BigInt(allowed)) throw new Error("observed content exceeds the bounded snapshot budget");

  await hooks.beforeOpen?.();
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
    const handleBefore = stableFileFacts(await handle.stat({ bigint: true }));
    if (!sameFileFacts(initial, handleBefore)) throw new Error("observed workspace path changed identity before its bounded read");
    await hooks.afterHandleValidated?.();

    const expected = Number(initial.size);
    const bytes = Buffer.alloc(expected + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead < expected) throw new Error("observed workspace file produced a short bounded read");
    if (bytesRead > expected) throw new Error("observed workspace file grew during its bounded read");
    await hooks.afterRead?.();

    const handleAfter = stableFileFacts(await handle.stat({ bigint: true }));
    let pathAfterStat: BigIntStats;
    try {
      pathAfterStat = await lstat(absolute, { bigint: true });
    } catch (error) {
      throw new Error(`observed workspace path disappeared after its bounded read: ${error instanceof Error ? error.message : String(error)}`);
    }
    const pathAfter = stableFileFacts(pathAfterStat);
    if (!sameFileFacts(initial, handleAfter) || !sameFileFacts(initial, pathAfter)) {
      throw new Error("observed workspace path changed identity, type, mode, links or size during its bounded read");
    }
    await assertPhysicalContainment(root, absolute);
    budget.total += expected;
    return { bytes: bytes.subarray(0, expected), mode: String(initial.mode) };
  } finally {
    if (handle) await handle.close();
    await hooks.afterClose?.();
  }
}

function stableFactsIdentity(facts: StableFileFacts): string {
  return [facts.dev, facts.ino, facts.mode, facts.nlink, facts.size, facts.regular, facts.symbolicLink].join(":");
}

async function trackedLinkIdentity(
  root: string,
  entry: IndexCensusEntry,
  budget: { total: number },
): Promise<string> {
  const absolute = path.resolve(root, ...entry.path.split("/"));
  if (!inside(root, absolute)) throw new Error(`tracked symbolic link ${entry.path} escapes the worktree`);
  let initialStat: BigIntStats;
  try {
    initialStat = await lstat(absolute, { bigint: true });
  } catch (error) {
    throw new Error(`tracked symbolic link ${entry.path} is dangling or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const initial = stableFileFacts(initialStat);
  const limits = { maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TRACKED_LINK_TARGET_BYTES };

  if (!initial.symbolicLink) {
    if (!initial.regular) throw new Error(`tracked symbolic link ${entry.path} has an unsupported checkout representation`);
    const placeholder = await readBoundedWorkspaceFile(root, absolute, budget, {}, limits);
    if (!placeholder) throw new Error(`tracked symbolic link ${entry.path} disappeared during placeholder inspection`);
    const after = stableFileFacts(await lstat(absolute, { bigint: true }));
    if (!sameFileFacts(initial, after)) {
      throw new Error(`tracked symbolic link ${entry.path} changed checkout representation during bounded inspection`);
    }
    return digest([
      entry.tag, entry.mode, entry.objectId, String(entry.stage), entry.path,
      "regular-placeholder", stableFactsIdentity(initial), placeholder.mode, placeholder.bytes,
    ]);
  }

  const targetBytes = await readlink(absolute, { encoding: "buffer" }) as unknown as Buffer;
  if (targetBytes.length > MAX_TRACKED_LINK_TEXT_BYTES) {
    throw new Error(`tracked symbolic link ${entry.path} target exceeds ${MAX_TRACKED_LINK_TEXT_BYTES} bytes`);
  }
  if (budget.total + targetBytes.length > MAX_TRACKED_LINK_TARGET_BYTES) {
    throw new Error(`tracked symbolic-link targets exceed ${MAX_TRACKED_LINK_TARGET_BYTES} aggregate bytes`);
  }
  budget.total += targetBytes.length;
  let resolved: string;
  try {
    resolved = await realpath(absolute);
  } catch (error) {
    throw new Error(`tracked symbolic link ${entry.path} is dangling or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (canonicalPath(resolved) !== canonicalPath(root) && !inside(root, resolved)) {
    throw new Error(`tracked symbolic link ${entry.path} resolves outside the physical worktree`);
  }
  const target = await readBoundedWorkspaceFile(root, resolved, budget, {}, limits);
  if (!target) throw new Error(`tracked symbolic link ${entry.path} target disappeared during bounded inspection`);

  const after = stableFileFacts(await lstat(absolute, { bigint: true }));
  const afterTargetBytes = await readlink(absolute, { encoding: "buffer" }) as unknown as Buffer;
  const afterResolved = await realpath(absolute);
  if (!sameFileFacts(initial, after) || !targetBytes.equals(afterTargetBytes) || canonicalPath(resolved) !== canonicalPath(afterResolved)) {
    throw new Error(`tracked symbolic link ${entry.path} changed identity or target during bounded inspection`);
  }
  if (canonicalPath(afterResolved) !== canonicalPath(root) && !inside(root, afterResolved)) {
    throw new Error(`tracked symbolic link ${entry.path} resolves outside the physical worktree`);
  }
  return digest([
    entry.tag, entry.mode, entry.objectId, String(entry.stage), entry.path,
    "symbolic-link", stableFactsIdentity(initial), targetBytes, canonicalPath(resolved), target.mode, target.bytes,
  ]);
}

async function fileIdentity(
  root: string,
  observed: StatusPath,
  run: StepGitRun,
  budget: { total: number },
): Promise<string> {
  const parsed = parsePlanPath(observed.path, { observed: true });
  if (!parsed.ok) throw new Error(`unsafe observed path ${JSON.stringify(observed.path)}: ${parsed.reason}`);
  const absolute = path.resolve(root, ...parsed.path.split("/"));
  if (!inside(root, absolute)) throw new Error(`observed path ${parsed.path} escapes the worktree`);
  await assertPhysicalContainment(root, absolute);
  const indexStageBytes = await run(root, ["ls-files", "--stage", "-z", "--", literalPathspec(parsed.path)]);
  const indexStage = decode(indexStageBytes);
  for (const entry of indexStage.split("\0").filter(Boolean)) {
    const mode = entry.split(" ", 1)[0];
    if (mode === "120000") throw new Error(`observed path ${parsed.path} is an indexed symbolic link`);
    if (mode === "160000") throw new Error(`observed path ${parsed.path} is an unsupported Git link`);
  }
  const worktree = await readBoundedWorkspaceFile(root, absolute, budget);
  const mode = worktree?.mode ?? "missing";
  const worktreeBytes = worktree?.bytes ?? Buffer.alloc(0);
  let indexBytes: Buffer = Buffer.alloc(0);
  if (![".", "?", "D"].includes(observed.index) && observed.role !== "rename-source") {
    indexBytes = await run(root, ["show", "--no-textconv", `:${parsed.path}`]);
    if (indexBytes.length > MAX_FILE_BYTES || budget.total + indexBytes.length > MAX_TOTAL_FILE_BYTES) throw new Error("index content exceeds the bounded snapshot budget");
    budget.total += indexBytes.length;
  }
  return digest([observed.index, observed.worktree, observed.role, mode, indexStageBytes, indexBytes, worktreeBytes]);
}

interface WorkspaceCapture {
  snapshot: StepPacketWorkspace;
  indexFlags: IndexFlagCensus;
}

async function captureOnce(root: string, worktree: string, run: StepGitRun): Promise<WorkspaceCapture> {
  const [branchRaw, headRaw, statusRaw, indexFlagsRaw] = await Promise.all([
    run(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]),
    run(root, ["rev-parse", "--verify", "HEAD^{commit}"]),
    run(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--renames"]),
    run(root, ["ls-files", "-v", "-s", "-z", "--full-name", "--"]),
  ]);
  const branch = decode(branchRaw).trim();
  const head = decode(headRaw).trim();
  if (!branch) throw new Error("workspace HEAD is detached");
  if (!/^[0-9a-f]{40}$/i.test(head)) throw new Error("workspace HEAD is not a full commit SHA");
  const indexFlags = parseIndexFlagCensus(indexFlagsRaw);
  const unsupportedMode = indexFlags.entries.find((entry) => !["100644", "100755", "120000", "160000"].includes(entry.mode));
  if (unsupportedMode) throw new Error(`tracked path ${JSON.stringify(unsupportedMode.path)} has unsupported Git mode ${unsupportedMode.mode}`);
  const stagedConflict = indexFlags.entries.find((entry) => entry.stage !== 0);
  if (stagedConflict) throw new Error(`tracked path ${JSON.stringify(stagedConflict.path)} has unsupported non-zero index stage ${stagedConflict.stage}`);
  const gitlink = indexFlags.entries.find((entry) => entry.mode === "160000");
  if (gitlink) throw new Error(`tracked path ${JSON.stringify(gitlink.path)} is an unsupported Git link (gitlink)`);
  const budget = { total: 0 };
  const entries: StepWorkspaceEntry[] = [];
  for (const observed of parsePorcelainV1Z(statusRaw)) {
    const parsed = parsePlanPath(observed.path, { observed: true });
    if (!parsed.ok) throw new Error(`unsafe observed path: ${parsed.reason}`);
    entries.push({
      path: parsed.path,
      index: observed.index,
      worktree: observed.worktree,
      content: await fileIdentity(root, observed, run, budget),
    });
  }
  const linkBudget = { total: 0 };
  for (const link of indexFlags.entries.filter((entry) => entry.mode === "120000")) {
    entries.push({
      path: link.path,
      index: ".",
      worktree: ".",
      content: await trackedLinkIdentity(root, link, linkBudget),
    });
  }
  if (entries.length > MAX_ENTRIES) throw new Error(`workspace has more than ${MAX_ENTRIES} retained dirty/link paths`);
  entries.sort((left, right) => lexicalCompare(left.path, right.path) || lexicalCompare(left.index, right.index) || lexicalCompare(left.worktree, right.worktree));
  return {
    snapshot: { branch, worktree, head: head.toLowerCase(), entries },
    indexFlags,
  };
}

export type WorkspaceSnapshotResult =
  | { ok: true; snapshot: StepPacketWorkspace; headChanges: string[] }
  | { ok: false; reason: string };

/**
 * Collect a stable read-only Git snapshot. Every command uses
 * `--no-optional-locks`; two identical samples are required before facts are
 * accepted.
 */
export async function collectWorkspaceSnapshot(input: {
  repoRoot: string;
  boardRoot: string;
  worktree: string;
  branch: string;
  baseline?: StepPacketWorkspace;
  run?: StepGitRun;
  /** Test/internal tightening only; callers cannot extend the production cap. */
  maxDurationMs?: number;
  /** Test-only deterministic seam for proving index-flag drift between samples. */
  betweenSamples?: () => void | Promise<void>;
}): Promise<WorkspaceSnapshotResult> {
  try {
    if (input.maxDurationMs !== undefined && (!Number.isFinite(input.maxDurationMs) || input.maxDurationMs <= 0)) {
      throw new Error("workspace collection duration must be a finite positive number");
    }
    const duration = Math.min(WORKSPACE_COLLECTION_TIMEOUT_MS, input.maxDurationMs ?? WORKSPACE_COLLECTION_TIMEOUT_MS);
    const deadline = Date.now() + duration;
    const run = deadlineRun(input.run, deadline);
    const declared = parsePlanPath(input.worktree);
    if (!declared.ok || declared.path !== input.worktree) {
      throw new Error(`recorded worktree is not a canonical repository-relative path${declared.ok ? "" : `: ${declared.reason}`}`);
    }
    const candidate = path.resolve(input.repoRoot, ...declared.path.split("/"));
    if (!inside(input.repoRoot, candidate)) throw new Error("recorded worktree escapes the source repository");
    const [physical, physicalSource, physicalBoard, candidateTopRaw, candidateCommonRaw, sourceCommonRaw] = await Promise.all([
      realpath(candidate),
      realpath(input.repoRoot),
      realpath(input.boardRoot),
      run(candidate, ["rev-parse", "--show-toplevel"]),
      run(candidate, ["rev-parse", "--git-common-dir"]),
      run(input.repoRoot, ["rev-parse", "--git-common-dir"]),
    ]);
    if (!inside(physicalSource, physical)) throw new Error("recorded worktree resolves outside the physical source repository");
    const candidateTop = await realpath(path.resolve(candidate, decode(candidateTopRaw).trim()));
    if (isProtectedBoardExecutionWorktree(physicalSource, physicalBoard, physical)) {
      throw new Error("recorded workspace is the protected board worktree or one of its children");
    }
    if (canonicalPath(candidateTop) !== canonicalPath(physical)) {
      throw new Error("recorded worktree points inside a Git worktree instead of at its exact root");
    }
    const candidateCommon = await realpath(path.resolve(candidate, decode(candidateCommonRaw).trim()));
    const sourceCommon = await realpath(path.resolve(input.repoRoot, decode(sourceCommonRaw).trim()));
    if (canonicalPath(candidateCommon) !== canonicalPath(sourceCommon)) throw new Error("recorded workspace belongs to a foreign repository");
    const first = await captureOnce(physical, input.worktree, run);
    await input.betweenSamples?.();
    const second = await captureOnce(physical, input.worktree, run);
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("workspace changed during the bounded double-sample");
    if (first.indexFlags.assumeUnchanged.length) {
      throw new Error(`tracked path ${JSON.stringify(first.indexFlags.assumeUnchanged[0])} has assume-unchanged index authority`);
    }
    if (first.indexFlags.skipWorktree.length) {
      throw new Error(`tracked path ${JSON.stringify(first.indexFlags.skipWorktree[0])} has skip-worktree index authority`);
    }
    if (first.snapshot.branch !== input.branch) throw new Error(`recorded branch ${input.branch} does not match checked-out branch ${first.snapshot.branch}`);
    let headChanges: string[] = [];
    if (input.baseline && input.baseline.head !== first.snapshot.head) {
      const raw = await run(physical, ["diff", "--name-status", "-z", "--find-renames", input.baseline.head!, first.snapshot.head!, "--"]);
      headChanges = parseNameStatusZ(raw);
      for (const changed of headChanges) {
        const parsed = parsePlanPath(changed, { observed: true });
        if (!parsed.ok) throw new Error(`unsafe HEAD-diff path: ${parsed.reason}`);
        const absolute = path.resolve(physical, ...parsed.path.split("/"));
        await assertPhysicalContainment(physical, absolute);
        try {
          const stat = await lstat(absolute);
          if (stat.isSymbolicLink()) throw new Error(`HEAD-diff path ${parsed.path} is a symbolic link`);
          if (stat.isFile() && stat.nlink > 1) throw new Error(`HEAD-diff path ${parsed.path} is hard-linked outside its single workspace identity`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        for (const tree of [input.baseline.head!, first.snapshot.head!]) {
          const treeEntry = decode(await run(physical, ["ls-tree", "-z", tree, "--", literalPathspec(parsed.path)]));
          if (/^120000 /.test(treeEntry)) throw new Error(`HEAD-diff path ${parsed.path} is a committed symbolic link`);
          if (/^160000 /.test(treeEntry)) throw new Error(`HEAD-diff path ${parsed.path} is an unsupported Git link`);
        }
      }
    }
    if (Date.now() >= deadline) throw new Error("aggregate Git collection deadline exhausted");
    return { ok: true, snapshot: first.snapshot, headChanges };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export interface StepDocumentSnapshot {
  item: Item;
  revision: string | null;
  gates: Awaited<ReturnType<KanmerStore["getDocGates"]>>;
  fixed: TicketDocumentWithVersion[];
  inventory: TicketDocumentWithVersion[];
  evidence: StepPacketEvidence[];
  groups: Array<{ id: string; kind: string; title: string; body: string; context: string | null; version: string | null }>;
  batch: Awaited<ReturnType<KanmerStore["batchState"]>>;
  batchId: string | null;
}

export type StepDocumentSnapshotResult =
  | { ok: true; snapshot: StepDocumentSnapshot }
  | { ok: false; reason: string };

/** Authority projection used when bracketing Git; scratch/reference are exempt. */
export function stepDocumentSnapshotAuthority(snapshot: StepDocumentSnapshot): unknown {
  return {
    ...snapshot,
    inventory: snapshot.inventory.filter((document) => revisionCountsDocument(document.doc)),
  };
}

async function documentSample(store: KanmerStore, id: string): Promise<StepDocumentSnapshot> {
  const authority = await store.getExecutionAuthoritySnapshot(id);
  if (!authority) throw new Error(`No ticket with id "${id}"`);
  const { item, revision, gates, fixed, inventory } = authority;
  if (!item || item.type !== "ticket") throw new Error(`No ticket with id "${id}"`);
  const batch = await store.batchStateFromExecutionAuthority(item);
  if (!gates) throw new Error(`Ticket "${id}" has no document-gate report`);
  const groups = authority.groups.map(({ group, context, contextVersion }) => ({
    id: group.id,
    kind: group.kind,
    title: group.title,
    body: group.body,
    context,
    version: contextVersion,
  }));
  const canonicalItem = item.groups === undefined ? item : { ...item, groups: groups.map((group) => group.id) };
  const evidence: StepPacketEvidence[] = [
    ...groups.filter((group) => group.version !== null).map((group) => ({ layer: "group" as const, group: group.id, path: `${group.id}/context.md`, version: group.version! })),
    ...inventory.filter((doc) => /^(?:research|files)\//.test(doc.doc)).map((doc) => ({ layer: "ticket" as const, group: null, path: doc.doc, version: doc.version! })),
  ];
  const snapshot = { item: canonicalItem, revision: revision?.revision ?? null, gates, fixed, inventory, evidence, groups, batch, batchId: batch?.id ?? null };
  const authorityBudget = checkStepPacketBudget(stepDocumentSnapshotAuthority(snapshot));
  if (!authorityBudget.ok) throw new Error(`step document authority is outside its bounded snapshot: ${authorityBudget.reason}`);
  return snapshot;
}

/** Accept only two identical, document-inclusive samples. */
export async function collectStepDocumentSnapshot(
  store: KanmerStore,
  id: string,
  samples: 1 | 2 = 2,
): Promise<StepDocumentSnapshotResult> {
  try {
    const first = await documentSample(store, id);
    if (samples === 1) return { ok: true, snapshot: first };
    const second = await documentSample(store, id);
    if (JSON.stringify(stepDocumentSnapshotAuthority(first)) !== JSON.stringify(stepDocumentSnapshotAuthority(second))) {
      throw new Error("ticket, counted documents or group context changed during the bounded double-sample");
    }
    // Scratch/reference are deliberately revision-exempt and may move while a
    // worker records notes. Return the newest full inventory without making
    // those exempt documents packet authority.
    return { ok: true, snapshot: second };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
