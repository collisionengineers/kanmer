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

const COLLECTION_DEADLINE_REASON = "aggregate workspace collection deadline exhausted";

interface CollectionDeadline {
  expiresAt: number;
  now: () => number;
}

function collectionDeadlineError(): Error {
  return new Error(COLLECTION_DEADLINE_REASON);
}

function remainingCollectionTime(deadline: CollectionDeadline): number {
  return deadline.expiresAt - deadline.now();
}

function assertCollectionDeadline(deadline?: CollectionDeadline): void {
  if (deadline && remainingCollectionTime(deadline) <= 0) throw collectionDeadlineError();
}

/**
 * Bound one resource-free filesystem observation to the shared collection
 * deadline. Late completion is ignored but still observed by the attached
 * handlers, so it cannot become an unhandled rejection.
 */
function deadlineObservation<T>(deadline: CollectionDeadline | undefined, operation: () => Promise<T>): Promise<T> {
  if (!deadline) return operation();
  const remaining = remainingCollectionTime(deadline);
  if (remaining <= 0) return Promise.reject(collectionDeadlineError());
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(collectionDeadlineError());
    }, remaining);
    let observed: Promise<T>;
    try {
      observed = operation();
    } catch (error) {
      settled = true;
      clearTimeout(timer);
      reject(error);
      return;
    }
    observed.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (remainingCollectionTime(deadline) <= 0) reject(collectionDeadlineError());
        else resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(remainingCollectionTime(deadline) <= 0 ? collectionDeadlineError() : error);
      },
    );
  });
}

const defaultRun = (cwd: string, args: readonly string[], timeout: number): Promise<Buffer> => new Promise((resolve, reject) => {
  execFile(
    "git",
    ["--no-optional-locks", "-C", cwd, ...args],
    { encoding: "buffer", windowsHide: true, timeout, maxBuffer: GIT_MAX_BUFFER },
    (error, stdout) => error ? reject(error) : resolve(Buffer.from(stdout)),
  );
});

function deadlineRun(source: StepGitRun | undefined, deadline: CollectionDeadline): StepGitRun {
  return async (cwd, args) => {
    const remaining = remainingCollectionTime(deadline);
    if (remaining <= 0) throw collectionDeadlineError();
    const timeout = Math.max(1, Math.min(GIT_TIMEOUT_MS, remaining));
    return deadlineObservation(deadline, () => source ? source(cwd, args) : defaultRun(cwd, args, timeout));
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

async function assertPhysicalContainment(root: string, absolute: string, deadline?: CollectionDeadline): Promise<void> {
  let cursor = absolute;
  for (;;) {
    assertCollectionDeadline(deadline);
    try {
      const resolved = await deadlineObservation(deadline, () => realpath(cursor));
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
  directory: boolean;
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
    directory: stat.isDirectory(),
    symbolicLink: stat.isSymbolicLink(),
  };
}

function sameFileFacts(left: StableFileFacts, right: StableFileFacts): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode &&
    left.nlink === right.nlink && left.size === right.size && left.regular === right.regular &&
    left.directory === right.directory && left.symbolicLink === right.symbolicLink;
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
  deadline?: CollectionDeadline,
): Promise<{ bytes: Buffer; mode: string } | null> {
  await assertPhysicalContainment(root, absolute, deadline);
  let initialStat: BigIntStats;
  try {
    initialStat = await deadlineObservation(deadline, () => lstat(absolute, { bigint: true }));
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

  assertCollectionDeadline(deadline);
  await hooks.beforeOpen?.();
  assertCollectionDeadline(deadline);
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
    assertCollectionDeadline(deadline);
    const handleBefore = stableFileFacts(await handle.stat({ bigint: true }));
    assertCollectionDeadline(deadline);
    if (!sameFileFacts(initial, handleBefore)) throw new Error("observed workspace path changed identity before its bounded read");
    await hooks.afterHandleValidated?.();
    assertCollectionDeadline(deadline);

    const expected = Number(initial.size);
    const bytes = Buffer.alloc(expected + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    assertCollectionDeadline(deadline);
    if (bytesRead < expected) throw new Error("observed workspace file produced a short bounded read");
    if (bytesRead > expected) throw new Error("observed workspace file grew during its bounded read");
    await hooks.afterRead?.();
    assertCollectionDeadline(deadline);

    const handleAfter = stableFileFacts(await handle.stat({ bigint: true }));
    assertCollectionDeadline(deadline);
    let pathAfterStat: BigIntStats;
    try {
      pathAfterStat = await deadlineObservation(deadline, () => lstat(absolute, { bigint: true }));
    } catch (error) {
      if (error instanceof Error && error.message === COLLECTION_DEADLINE_REASON) throw error;
      throw new Error(`observed workspace path disappeared after its bounded read: ${error instanceof Error ? error.message : String(error)}`);
    }
    const pathAfter = stableFileFacts(pathAfterStat);
    if (!sameFileFacts(initial, handleAfter) || !sameFileFacts(initial, pathAfter)) {
      throw new Error("observed workspace path changed identity, type, mode, links or size during its bounded read");
    }
    await assertPhysicalContainment(root, absolute, deadline);
    budget.total += expected;
    assertCollectionDeadline(deadline);
    return { bytes: bytes.subarray(0, expected), mode: String(initial.mode) };
  } finally {
    if (handle) await handle.close();
    await hooks.afterClose?.();
    assertCollectionDeadline(deadline);
  }
}

function stableFactsIdentity(facts: StableFileFacts): string {
  return [facts.dev, facts.ino, facts.mode, facts.nlink, facts.size, facts.regular, facts.directory, facts.symbolicLink].join(":");
}

interface ConfinedPathProof {
  digest: string;
  final: StableFileFacts | null;
  missing: boolean;
}

/**
 * Prove every lexical component below the already-physical worktree root.
 * Directory facts omit size/link-count churn, while the terminal identity is
 * complete. A tracked link may be the terminal component only; its target is
 * proved separately as a direct regular path.
 */
async function confinedPathProof(
  root: string,
  absolute: string,
  terminal: "regular" | "link" | "regular-or-missing",
  deadline?: CollectionDeadline,
): Promise<ConfinedPathProof> {
  if (!inside(root, absolute)) throw new Error("observed path is lexically outside the physical worktree");
  const relative = path.relative(root, absolute);
  const components = relative.split(path.sep).filter(Boolean);
  const identities: string[] = [];
  let cursor = root;
  for (let index = 0; index < components.length; index += 1) {
    assertCollectionDeadline(deadline);
    cursor = path.join(cursor, components[index]!);
    const final = index === components.length - 1;
    let stat: BigIntStats;
    try {
      stat = await deadlineObservation(deadline, () => lstat(cursor, { bigint: true }));
    } catch (error) {
      if (terminal === "regular-or-missing" && (error as NodeJS.ErrnoException).code === "ENOENT") {
        identities.push(`${components.slice(index).join("/")}:missing`);
        return { digest: digest(identities), final: null, missing: true };
      }
      throw error;
    }
    const facts = stableFileFacts(stat);
    if (!final) {
      if (facts.symbolicLink || !facts.directory) {
        throw new Error(
          "observed path is outside the physical worktree direct-component contract because it contains a symbolic-link or junction component",
        );
      }
      identities.push(`${components[index]}:${facts.dev}:${facts.ino}:${facts.mode}:${facts.directory}:${facts.symbolicLink}`);
      continue;
    }
    if (terminal === "link") {
      if (!facts.symbolicLink) throw new Error("tracked symbolic link changed checkout representation");
    } else {
      if (facts.symbolicLink || !facts.regular) throw new Error("observed workspace path is not a direct regular file");
      if (facts.nlink !== 1n) throw new Error("observed workspace path is hard-linked outside its single workspace identity");
    }
    identities.push(`${components[index]}:${stableFactsIdentity(facts)}`);
    return { digest: digest(identities), final: facts, missing: false };
  }
  throw new Error("observed path does not name a worktree descendant");
}

interface TrackedLinkTargetProof {
  absolute: string;
  proof: ConfinedPathProof;
}

function sameOrInside(root: string, candidate: string): boolean {
  return canonicalPath(root) === canonicalPath(candidate) || inside(root, candidate);
}

function rawTargetSegments(value: string): string[] {
  return value.split(process.platform === "win32" ? /[\\/]+/u : /\/+/u).filter((segment) => segment.length > 0);
}

function pathSpellingEqual(left: string, right: string): boolean {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/**
 * Follow raw tracked-link target components in kernel order. In particular,
 * never collapse `hop/..` before proving that `hop` is a real directory: on
 * POSIX the kernel follows a symlink at `hop` before it applies the parent
 * component.
 */
async function trackedLinkTargetProof(
  root: string,
  linkAbsolute: string,
  targetText: string,
  deadline?: CollectionDeadline,
): Promise<TrackedLinkTargetProof> {
  if (!targetText || targetText.includes("\0")) throw new Error("tracked symbolic link has an empty or NUL target");
  const targetParsed = path.parse(targetText);
  let cursor: string;
  let components: string[];
  if (path.isAbsolute(targetText)) {
    const rootParsed = path.parse(root);
    if (!pathSpellingEqual(targetParsed.root, rootParsed.root)) {
      throw new Error("tracked symbolic link target resolves outside the physical worktree");
    }
    const rootSegments = rawTargetSegments(root.slice(rootParsed.root.length));
    const targetSegments = rawTargetSegments(targetText.slice(targetParsed.root.length));
    if (targetSegments.length < rootSegments.length || rootSegments.some((segment, index) =>
      !pathSpellingEqual(segment, targetSegments[index]!))) {
      throw new Error("tracked symbolic link absolute target is outside the physical worktree because it does not directly share its prefix");
    }
    cursor = root;
    components = targetSegments.slice(rootSegments.length);
  } else {
    if (targetParsed.root) throw new Error("tracked symbolic link has an unsupported drive-relative target");
    cursor = path.dirname(linkAbsolute);
    if (!sameOrInside(root, cursor)) throw new Error("tracked symbolic link parent is outside the physical worktree");
    components = rawTargetSegments(targetText);
  }
  if (components.length === 0) throw new Error("tracked symbolic link target does not name a file");

  const identities: string[] = [`base:${canonicalPath(cursor)}`];
  let finalFacts: StableFileFacts | null = null;
  for (let index = 0; index < components.length; index += 1) {
    assertCollectionDeadline(deadline);
    const component = components[index]!;
    const final = index === components.length - 1;
    if (component === ".") {
      identities.push(".:same");
      continue;
    }
    if (component === "..") {
      const parent = path.dirname(cursor);
      if (!sameOrInside(root, parent)) {
        throw new Error("tracked symbolic link parent traversal is outside the physical worktree");
      }
      cursor = parent;
      identities.push(`..:${canonicalPath(cursor)}`);
      continue;
    }

    const candidate = path.join(cursor, component);
    if (!sameOrInside(root, candidate)) throw new Error("tracked symbolic link target leaves the physical worktree");
    const facts = stableFileFacts(await deadlineObservation(deadline, () => lstat(candidate, { bigint: true })));
    if (!final) {
      if (facts.symbolicLink || !facts.directory) {
        throw new Error(
          "tracked symbolic link raw target contains a symbolic-link or junction component before normalization",
        );
      }
      identities.push(`${component}:${facts.dev}:${facts.ino}:${facts.mode}:${facts.directory}:${facts.symbolicLink}`);
      cursor = candidate;
      continue;
    }
    if (facts.symbolicLink || !facts.regular) throw new Error("tracked symbolic link final target is not a direct regular file");
    if (facts.nlink !== 1n) throw new Error("tracked symbolic link final target is hard-linked outside its single workspace identity");
    identities.push(`${component}:${stableFactsIdentity(facts)}`);
    cursor = candidate;
    finalFacts = facts;
  }

  if (!finalFacts) {
    const facts = stableFileFacts(await deadlineObservation(deadline, () => lstat(cursor, { bigint: true })));
    if (facts.symbolicLink || !facts.regular) throw new Error("tracked symbolic link final target is not a direct regular file");
    if (facts.nlink !== 1n) throw new Error("tracked symbolic link final target is hard-linked outside its single workspace identity");
    identities.push(`terminal:${stableFactsIdentity(facts)}`);
    finalFacts = facts;
  }
  return {
    absolute: cursor,
    proof: { digest: digest(identities), final: finalFacts, missing: false },
  };
}

async function trackedLinkIdentity(
  root: string,
  entry: IndexCensusEntry,
  budget: { total: number },
  deadline?: CollectionDeadline,
): Promise<string> {
  const absolute = path.resolve(root, ...entry.path.split("/"));
  if (!inside(root, absolute)) throw new Error(`tracked symbolic link ${entry.path} escapes the worktree`);
  const limits = { maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TRACKED_LINK_TARGET_BYTES };
  const decodeTarget = (bytes: Buffer): string => {
    if (bytes.length > MAX_TRACKED_LINK_TEXT_BYTES) {
      throw new Error(`tracked symbolic link ${entry.path} target exceeds ${MAX_TRACKED_LINK_TEXT_BYTES} bytes`);
    }
    try {
      return decode(bytes);
    } catch (error) {
      throw new Error(`tracked symbolic link ${entry.path} target is not valid UTF-8: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  let initialProof: ConfinedPathProof;
  try {
    initialProof = await confinedPathProof(root, absolute, "link", deadline);
  } catch (error) {
    if (error instanceof Error && error.message === COLLECTION_DEADLINE_REASON) throw error;
    let placeholderProof: ConfinedPathProof;
    try {
      placeholderProof = await confinedPathProof(root, absolute, "regular", deadline);
    } catch (placeholderError) {
      if (placeholderError instanceof Error && placeholderError.message === COLLECTION_DEADLINE_REASON) throw placeholderError;
      throw new Error(`tracked symbolic link ${entry.path} is dangling or unreadable: ${error instanceof Error ? error.message : String(error)}`);
    }
    const placeholder = await readBoundedWorkspaceFile(root, absolute, budget, {}, limits, deadline);
    if (!placeholder) throw new Error(`tracked symbolic link ${entry.path} disappeared during placeholder inspection`);
    const targetText = decodeTarget(placeholder.bytes);
    const targetState = await trackedLinkTargetProof(root, absolute, targetText, deadline);
    const resolved = await deadlineObservation(deadline, () => realpath(targetState.absolute));
    if (canonicalPath(resolved) !== canonicalPath(targetState.absolute)) {
      throw new Error(`tracked symbolic link ${entry.path} target is not direct`);
    }
    const target = await readBoundedWorkspaceFile(root, targetState.absolute, budget, {}, limits, deadline);
    if (!target) throw new Error(`tracked symbolic link ${entry.path} target disappeared during bounded inspection`);
    const afterTargetState = await trackedLinkTargetProof(root, absolute, targetText, deadline);
    const afterResolved = await deadlineObservation(deadline, () => realpath(afterTargetState.absolute));
    const afterProof = await confinedPathProof(root, absolute, "regular", deadline);
    if (placeholderProof.digest !== afterProof.digest || targetState.proof.digest !== afterTargetState.proof.digest ||
        canonicalPath(targetState.absolute) !== canonicalPath(afterTargetState.absolute) ||
        canonicalPath(resolved) !== canonicalPath(afterResolved)) {
      throw new Error(`tracked symbolic link ${entry.path} changed checkout representation during bounded inspection`);
    }
    return digest([
      entry.tag, entry.mode, entry.objectId, String(entry.stage), entry.path,
      "regular-placeholder", placeholderProof.digest, placeholder.mode, placeholder.bytes,
      targetState.proof.digest, canonicalPath(resolved), target.mode, target.bytes,
    ]);
  }

  const targetBytes = await deadlineObservation(deadline, async () =>
    await readlink(absolute, { encoding: "buffer" }) as unknown as Buffer);
  if (targetBytes.length > MAX_TRACKED_LINK_TEXT_BYTES) {
    throw new Error(`tracked symbolic link ${entry.path} target exceeds ${MAX_TRACKED_LINK_TEXT_BYTES} bytes`);
  }
  if (budget.total + targetBytes.length > MAX_TRACKED_LINK_TARGET_BYTES) {
    throw new Error(`tracked symbolic-link targets exceed ${MAX_TRACKED_LINK_TARGET_BYTES} aggregate bytes`);
  }
  budget.total += targetBytes.length;
  const targetText = decodeTarget(targetBytes);
  const targetState = await trackedLinkTargetProof(root, absolute, targetText, deadline);
  const resolved = await deadlineObservation(deadline, () => realpath(targetState.absolute));
  if (canonicalPath(resolved) !== canonicalPath(targetState.absolute)) {
    throw new Error(`tracked symbolic link ${entry.path} target is not direct`);
  }
  const target = await readBoundedWorkspaceFile(root, targetState.absolute, budget, {}, limits, deadline);
  if (!target) throw new Error(`tracked symbolic link ${entry.path} target disappeared during bounded inspection`);

  const afterProof = await confinedPathProof(root, absolute, "link", deadline);
  const afterTargetBytes = await deadlineObservation(deadline, async () =>
    await readlink(absolute, { encoding: "buffer" }) as unknown as Buffer);
  const afterTargetText = decodeTarget(afterTargetBytes);
  const afterTargetState = await trackedLinkTargetProof(root, absolute, afterTargetText, deadline);
  const afterResolved = await deadlineObservation(deadline, () => realpath(afterTargetState.absolute));
  if (initialProof.digest !== afterProof.digest || !targetBytes.equals(afterTargetBytes) ||
      canonicalPath(targetState.absolute) !== canonicalPath(afterTargetState.absolute) ||
      targetState.proof.digest !== afterTargetState.proof.digest ||
      canonicalPath(resolved) !== canonicalPath(afterResolved)) {
    throw new Error(`tracked symbolic link ${entry.path} changed identity or target during bounded inspection`);
  }
  if (canonicalPath(afterResolved) !== canonicalPath(afterTargetState.absolute)) {
    throw new Error(`tracked symbolic link ${entry.path} target is not direct`);
  }
  return digest([
    entry.tag, entry.mode, entry.objectId, String(entry.stage), entry.path,
    "symbolic-link", initialProof.digest, targetBytes, targetState.proof.digest, canonicalPath(resolved), target.mode, target.bytes,
  ]);
}

async function trackedRegularMetadataCensus(
  root: string,
  entries: readonly IndexCensusEntry[],
  status: readonly StatusPath[],
  deadline: CollectionDeadline,
  beforeEntry?: (path: string) => void | Promise<void>,
): Promise<{ count: number; digest: string }> {
  const regular = entries.filter((entry) => entry.mode === "100644" || entry.mode === "100755");
  const identities: string[] = [];
  const porcelainRemovals = new Set(status.filter((observed) =>
    (observed.role === "path" && observed.worktree === "D") ||
    (observed.role === "rename-source" && observed.worktree === "R")
  ).map((observed) => observed.path));
  for (const entry of regular) {
    assertCollectionDeadline(deadline);
    await beforeEntry?.(entry.path);
    assertCollectionDeadline(deadline);
    const absolute = path.resolve(root, ...entry.path.split("/"));
    const proof = await confinedPathProof(root, absolute, "regular-or-missing", deadline);
    assertCollectionDeadline(deadline);
    const porcelainDeletion = porcelainRemovals.has(entry.path);
    if (proof.missing && !porcelainDeletion) {
      throw new Error(`tracked regular path ${JSON.stringify(entry.path)} is missing without a matching porcelain worktree deletion`);
    }
    if (!proof.missing && porcelainDeletion) {
      throw new Error(`tracked regular path ${JSON.stringify(entry.path)} is present despite a porcelain worktree deletion`);
    }
    identities.push(digest([entry.path, entry.mode, entry.objectId, String(entry.stage), proof.missing ? "missing" : "regular", proof.digest]));
  }
  return { count: regular.length, digest: digest(identities) };
}

async function fileIdentity(
  root: string,
  observed: StatusPath,
  run: StepGitRun,
  budget: { total: number },
  deadline: CollectionDeadline,
): Promise<string> {
  assertCollectionDeadline(deadline);
  const parsed = parsePlanPath(observed.path, { observed: true });
  if (!parsed.ok) throw new Error(`unsafe observed path ${JSON.stringify(observed.path)}: ${parsed.reason}`);
  const absolute = path.resolve(root, ...parsed.path.split("/"));
  if (!inside(root, absolute)) throw new Error(`observed path ${parsed.path} escapes the worktree`);
  await assertPhysicalContainment(root, absolute, deadline);
  const indexStageBytes = await run(root, ["ls-files", "--stage", "-z", "--", literalPathspec(parsed.path)]);
  const indexStage = decode(indexStageBytes);
  for (const entry of indexStage.split("\0").filter(Boolean)) {
    const mode = entry.split(" ", 1)[0];
    if (mode === "120000") throw new Error(`observed path ${parsed.path} is an indexed symbolic link`);
    if (mode === "160000") throw new Error(`observed path ${parsed.path} is an unsupported Git link`);
  }
  const worktree = await readBoundedWorkspaceFile(root, absolute, budget, {}, undefined, deadline);
  const mode = worktree?.mode ?? "missing";
  const worktreeBytes = worktree?.bytes ?? Buffer.alloc(0);
  let indexBytes: Buffer = Buffer.alloc(0);
  if (![".", "?", "D"].includes(observed.index) && observed.role !== "rename-source") {
    indexBytes = await run(root, ["show", "--no-textconv", `:${parsed.path}`]);
    if (indexBytes.length > MAX_FILE_BYTES || budget.total + indexBytes.length > MAX_TOTAL_FILE_BYTES) throw new Error("index content exceeds the bounded snapshot budget");
    budget.total += indexBytes.length;
  }
  assertCollectionDeadline(deadline);
  return digest([observed.index, observed.worktree, observed.role, mode, indexStageBytes, indexBytes, worktreeBytes]);
}

interface WorkspaceCapture {
  snapshot: StepPacketWorkspace;
  indexFlags: IndexFlagCensus;
  regularFiles: { count: number; digest: string };
}

async function captureOnce(
  root: string,
  worktree: string,
  run: StepGitRun,
  deadline: CollectionDeadline,
  beforeRegularCensusEntry?: (path: string) => void | Promise<void>,
): Promise<WorkspaceCapture> {
  assertCollectionDeadline(deadline);
  const [branchRaw, headRaw, statusRaw, indexFlagsRaw] = await Promise.all([
    run(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]),
    run(root, ["rev-parse", "--verify", "HEAD^{commit}"]),
    run(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--renames"]),
    run(root, ["ls-files", "-v", "-s", "-z", "--full-name", "--"]),
  ]);
  assertCollectionDeadline(deadline);
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
  const status = parsePorcelainV1Z(statusRaw);
  const regularFiles = await trackedRegularMetadataCensus(root, indexFlags.entries, status, deadline, beforeRegularCensusEntry);
  const budget = { total: 0 };
  const entries: StepWorkspaceEntry[] = [];
  for (const observed of status) {
    assertCollectionDeadline(deadline);
    const parsed = parsePlanPath(observed.path, { observed: true });
    if (!parsed.ok) throw new Error(`unsafe observed path: ${parsed.reason}`);
    entries.push({
      path: parsed.path,
      index: observed.index,
      worktree: observed.worktree,
      content: await fileIdentity(root, observed, run, budget, deadline),
    });
  }
  const linkBudget = { total: 0 };
  for (const link of indexFlags.entries.filter((entry) => entry.mode === "120000")) {
    assertCollectionDeadline(deadline);
    entries.push({
      path: link.path,
      index: ".",
      worktree: ".",
      content: await trackedLinkIdentity(root, link, linkBudget, deadline),
    });
  }
  if (entries.length > MAX_ENTRIES) throw new Error(`workspace has more than ${MAX_ENTRIES} retained dirty/link paths`);
  entries.sort((left, right) => lexicalCompare(left.path, right.path) || lexicalCompare(left.index, right.index) || lexicalCompare(left.worktree, right.worktree));
  assertCollectionDeadline(deadline);
  return {
    snapshot: { branch, worktree, head: head.toLowerCase(), entries },
    indexFlags,
    regularFiles,
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
  /** Test-only deterministic seams for proving non-Git census deadlines. */
  testHooks?: {
    now?: () => number;
    beforeRegularCensusEntry?: (path: string) => void | Promise<void>;
  };
}): Promise<WorkspaceSnapshotResult> {
  try {
    if (input.maxDurationMs !== undefined && (!Number.isFinite(input.maxDurationMs) || input.maxDurationMs <= 0)) {
      throw new Error("workspace collection duration must be a finite positive number");
    }
    const duration = Math.min(WORKSPACE_COLLECTION_TIMEOUT_MS, input.maxDurationMs ?? WORKSPACE_COLLECTION_TIMEOUT_MS);
    const now = input.testHooks?.now ?? Date.now;
    const startedAt = now();
    if (!Number.isFinite(startedAt)) throw new Error("workspace collection clock must be finite");
    const deadline: CollectionDeadline = { expiresAt: startedAt + duration, now };
    const run = deadlineRun(input.run, deadline);
    const declared = parsePlanPath(input.worktree);
    if (!declared.ok || declared.path !== input.worktree) {
      throw new Error(`recorded worktree is not a canonical repository-relative path${declared.ok ? "" : `: ${declared.reason}`}`);
    }
    const candidate = path.resolve(input.repoRoot, ...declared.path.split("/"));
    if (!inside(input.repoRoot, candidate)) throw new Error("recorded worktree escapes the source repository");
    const [physical, physicalSource, physicalBoard, candidateTopRaw, candidateCommonRaw, sourceCommonRaw] = await Promise.all([
      deadlineObservation(deadline, () => realpath(candidate)),
      deadlineObservation(deadline, () => realpath(input.repoRoot)),
      deadlineObservation(deadline, () => realpath(input.boardRoot)),
      run(candidate, ["rev-parse", "--show-toplevel"]),
      run(candidate, ["rev-parse", "--git-common-dir"]),
      run(input.repoRoot, ["rev-parse", "--git-common-dir"]),
    ]);
    assertCollectionDeadline(deadline);
    if (!inside(physicalSource, physical)) throw new Error("recorded worktree resolves outside the physical source repository");
    const candidateTop = await deadlineObservation(deadline, () => realpath(path.resolve(candidate, decode(candidateTopRaw).trim())));
    if (isProtectedBoardExecutionWorktree(physicalSource, physicalBoard, physical)) {
      throw new Error("recorded workspace is the protected board worktree or one of its children");
    }
    if (canonicalPath(candidateTop) !== canonicalPath(physical)) {
      throw new Error("recorded worktree points inside a Git worktree instead of at its exact root");
    }
    const candidateCommon = await deadlineObservation(deadline, () => realpath(path.resolve(candidate, decode(candidateCommonRaw).trim())));
    const sourceCommon = await deadlineObservation(deadline, () => realpath(path.resolve(input.repoRoot, decode(sourceCommonRaw).trim())));
    if (canonicalPath(candidateCommon) !== canonicalPath(sourceCommon)) throw new Error("recorded workspace belongs to a foreign repository");
    const first = await captureOnce(physical, input.worktree, run, deadline, input.testHooks?.beforeRegularCensusEntry);
    assertCollectionDeadline(deadline);
    await input.betweenSamples?.();
    assertCollectionDeadline(deadline);
    const second = await captureOnce(physical, input.worktree, run, deadline, input.testHooks?.beforeRegularCensusEntry);
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
        assertCollectionDeadline(deadline);
        const parsed = parsePlanPath(changed, { observed: true });
        if (!parsed.ok) throw new Error(`unsafe HEAD-diff path: ${parsed.reason}`);
        const absolute = path.resolve(physical, ...parsed.path.split("/"));
        await assertPhysicalContainment(physical, absolute, deadline);
        try {
          const stat = await deadlineObservation(deadline, () => lstat(absolute));
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
    assertCollectionDeadline(deadline);
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
  const { item, revision, gates, fixed, inventory, batch } = authority;
  if (!item || item.type !== "ticket") throw new Error(`No ticket with id "${id}"`);
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
