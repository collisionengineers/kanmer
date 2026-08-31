import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import {
  checkStepPacketBudget,
  contentVersion,
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
  let mode = "missing";
  let worktreeBytes: Buffer = Buffer.alloc(0);
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`observed path ${parsed.path} is a symbolic link`);
    if (!stat.isFile()) throw new Error(`observed path ${parsed.path} is not a regular file`);
    if (stat.nlink > 1) throw new Error(`observed path ${parsed.path} is hard-linked outside its single workspace identity`);
    if (stat.size > MAX_FILE_BYTES || budget.total + stat.size > MAX_TOTAL_FILE_BYTES) throw new Error(`observed content exceeds the bounded snapshot budget`);
    worktreeBytes = await readFile(absolute);
    budget.total += worktreeBytes.length;
    mode = String(stat.mode);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let indexBytes: Buffer = Buffer.alloc(0);
  if (![".", "?", "D"].includes(observed.index) && observed.role !== "rename-source") {
    indexBytes = await run(root, ["show", "--no-textconv", `:${parsed.path}`]);
    if (indexBytes.length > MAX_FILE_BYTES || budget.total + indexBytes.length > MAX_TOTAL_FILE_BYTES) throw new Error("index content exceeds the bounded snapshot budget");
    budget.total += indexBytes.length;
  }
  return digest([observed.index, observed.worktree, observed.role, mode, indexStageBytes, indexBytes, worktreeBytes]);
}

async function captureOnce(root: string, worktree: string, run: StepGitRun): Promise<StepPacketWorkspace> {
  const [branchRaw, headRaw, statusRaw] = await Promise.all([
    run(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]),
    run(root, ["rev-parse", "--verify", "HEAD^{commit}"]),
    run(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--renames"]),
  ]);
  const branch = decode(branchRaw).trim();
  const head = decode(headRaw).trim();
  if (!branch) throw new Error("workspace HEAD is detached");
  if (!/^[0-9a-f]{40}$/i.test(head)) throw new Error("workspace HEAD is not a full commit SHA");
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
  entries.sort((left, right) => lexicalCompare(left.path, right.path) || lexicalCompare(left.index, right.index) || lexicalCompare(left.worktree, right.worktree));
  return { branch, worktree, head: head.toLowerCase(), entries };
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
    if (canonicalPath(physical) === canonicalPath(physicalBoard) ||
        (inside(physicalBoard, physical) && canonicalPath(candidateTop) === canonicalPath(physicalBoard))) {
      throw new Error("recorded workspace is the protected board worktree or one of its children");
    }
    const candidateCommon = await realpath(path.resolve(candidate, decode(candidateCommonRaw).trim()));
    const sourceCommon = await realpath(path.resolve(input.repoRoot, decode(sourceCommonRaw).trim()));
    if (canonicalPath(candidateCommon) !== canonicalPath(sourceCommon)) throw new Error("recorded workspace belongs to a foreign repository");
    const first = await captureOnce(physical, input.worktree, run);
    const second = await captureOnce(physical, input.worktree, run);
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("workspace changed during the bounded double-sample");
    if (first.branch !== input.branch) throw new Error(`recorded branch ${input.branch} does not match checked-out branch ${first.branch}`);
    let headChanges: string[] = [];
    if (input.baseline && input.baseline.head !== first.head) {
      const raw = await run(physical, ["diff", "--name-status", "-z", "--find-renames", input.baseline.head!, first.head!, "--"]);
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
        for (const tree of [input.baseline.head!, first.head!]) {
          const treeEntry = decode(await run(physical, ["ls-tree", "-z", tree, "--", literalPathspec(parsed.path)]));
          if (/^120000 /.test(treeEntry)) throw new Error(`HEAD-diff path ${parsed.path} is a committed symbolic link`);
          if (/^160000 /.test(treeEntry)) throw new Error(`HEAD-diff path ${parsed.path} is an unsupported Git link`);
        }
      }
    }
    if (Date.now() >= deadline) throw new Error("aggregate Git collection deadline exhausted");
    return { ok: true, snapshot: first, headChanges };
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
  const before = await store.getRevision(id);
  const item = await store.getItem(id);
  if (!item || item.type !== "ticket") throw new Error(`No ticket with id "${id}"`);
  const [fixed, inventory, batch, gates] = await Promise.all([
    store.getDocsWithVersions(id, ["plan", "checklist", "files"]),
    store.listTicketDocsWithVersions(id),
    store.batchState(id),
    store.getDocGates(id),
  ]);
  if (!gates) throw new Error(`Ticket "${id}" has no document-gate report`);
  if ((inventory ?? []).filter((document) => revisionCountsDocument(document.doc)).length > 256) {
    throw new Error("counted ticket document inventory exceeds the bounded snapshot limit");
  }
  const groups = [] as StepDocumentSnapshot["groups"];
  for (const groupId of item.groups ?? []) {
    const group = await store.getGroup(groupId);
    if (!group) throw new Error(`Group "${groupId}" is missing`);
    const context = await store.getGroupDoc(groupId, "context.md");
    groups.push({ id: group.id, kind: group.kind, title: group.title, body: group.body, context, version: context === null ? null : contentVersion(context) });
  }
  const after = await store.getRevision(id);
  if (before?.revision !== after?.revision) throw new Error("ticket revision changed during document collection");
  const evidence: StepPacketEvidence[] = [
    ...groups.filter((group) => group.version !== null).map((group) => ({ layer: "group" as const, group: group.id, path: `${group.id}/context.md`, version: group.version! })),
    ...(inventory ?? []).filter((doc) => /^(?:research|files)\//.test(doc.doc)).map((doc) => ({ layer: "ticket" as const, group: null, path: doc.doc, version: doc.version! })),
  ];
  const snapshot = { item, revision: after?.revision ?? null, gates, fixed, inventory: inventory ?? [], evidence, groups, batch, batchId: batch?.id ?? null };
  const authorityBudget = checkStepPacketBudget(stepDocumentSnapshotAuthority(snapshot));
  if (!authorityBudget.ok) throw new Error(`step document authority is outside its bounded snapshot: ${authorityBudget.reason}`);
  return snapshot;
}

/** Accept only two identical, document-inclusive samples. */
export async function collectStepDocumentSnapshot(store: KanmerStore, id: string): Promise<StepDocumentSnapshotResult> {
  try {
    const first = await documentSample(store, id);
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
