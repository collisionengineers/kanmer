import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readlink, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { liveBoardBranchError, liveBoardBranchMatches } from "./syncBranch.js";
import { ensureIgnore, ignoreEntriesToAppend } from "./gitIgnore.js";

// Re-exported for the existing test surface; the implementation moved to gitIgnore.ts (GUI-149).
export { ignoreEntriesToAppend };
import type { NativeReconnectRequirement } from "../shared/ipc.js";
import { removeTreeWithRetry, withExclusiveFileLock } from "@kanmer/core";

const execFile = promisify(execFileCallback);

/**
 * The repository's merge gate protects this literal branch name.  Kanmer has
 * no authenticated GitHub protection API, so moving away from it must be an
 * explicit operator migration rather than an automatic Settings operation.
 */
export const PROTECTED_BOARD_BRANCH = "kanmer-board";

export interface BoardBranchHandoff {
  from: string;
  to: string;
  warning: string;
}

export interface KanmerGitStatus {
  available: boolean;
  boardRoot: string | null;
  branch: string;
  lastSync: string | null;
  error: string | null;
  paused: boolean;
  /** A hosted Actions-variable handoff remains pending after a custom rename. */
  handoffPending?: BoardBranchHandoff;
  /** A live worktree was observed on neither the cached nor requested branch. */
  branchMismatch?: boolean;
  /** The mismatch detector supplied the current error rather than preserving one. */
  branchMismatchError?: boolean;
  /** The mismatch detector supplied the current pause rather than preserving one. */
  branchMismatchPause?: boolean;
  /** Ahead/behind of the last-fetched origin ref (CORE-123); absent for non-Git boards. */
  sync?: BoardSyncState;
  /** User-scoped native plugins whose staged board branch needs explicit reconnect. */
  nativeReconnectRequired?: NativeReconnectRequirement;
  /** Provider registrations that failed after a branch was reconciled and must be retried. */
  providerReconciliationPending?: { providers: string[]; branch: string };
}

/**
 * Refresh the cached branch in an open project from the worktree itself.
 *
 * The administrator handoff happens outside the GUI: the worktree can be
 * renamed while the project remains open.  A cached branch is therefore only
 * a hint; the worktree's symbolic ref is the source of truth before applying
 * a protected-branch transition.
 */
export async function refreshBoardBranch(
  status: KanmerGitStatus,
  requestedBranch = status.branch,
  observed?: BoardWorktreeInspection,
): Promise<KanmerGitStatus> {
  if (!status.available || !status.boardRoot) return status;
  const destination = requestedBranch.trim() || PROTECTED_BOARD_BRANCH;
  const inspection = observed ?? await inspectBoardWorktree(status.boardRoot, destination);
  if (!liveBoardBranchMatches(destination, inspection)) {
    const mismatchError = status.branchMismatchError ?? status.error === null;
    const mismatchPause = status.branchMismatchPause ?? !status.paused;
    return {
      ...status,
      branchMismatch: true,
      branchMismatchError: mismatchError,
      branchMismatchPause: mismatchPause,
      error: mismatchError
        ? liveBoardBranchError(destination, inspection)
        : status.error,
      paused: true,
    };
  }
  // The observed branch proves the administrator handoff reached the requested
  // destination. Clear only the error/pause that this detector supplied; a
  // genuine sync failure that was already present must remain visible.
  const next = { ...status, branch: destination, branchMismatch: false };
  if (status.branchMismatchError) next.error = null;
  if (status.branchMismatchPause) next.paused = false;
  delete next.branchMismatchError;
  delete next.branchMismatchPause;
  return next;
}

/**
 * Refresh a branch preference without confusing an ordinary rename with an
 * administrator handoff. A live worktree on the saved branch is healthy input
 * for the existing custom-to-custom rename; only a live worktree on the exact
 * requested destination counts as a completed handoff. Every other branch is
 * still rejected by the normal mismatch path.
 */
export async function refreshBoardBranchForPreference(
  status: KanmerGitStatus,
  requestedBranch: string,
  observed?: BoardWorktreeInspection,
): Promise<KanmerGitStatus> {
  if (!status.available || !status.boardRoot) return status;
  const destination = requestedBranch.trim() || PROTECTED_BOARD_BRANCH;
  const inspection = observed ?? await inspectBoardWorktree(status.boardRoot, status.branch);
  const expected = inspection.actualBranch === destination ? destination : status.branch;
  // `inspectBoardWorktree` was intentionally read against the cached branch
  // so an ordinary custom rename remains healthy. Once the live branch is the
  // requested destination, normalize the expected field before handing the
  // observation to the strict matcher; otherwise the stale cached expectation
  // would reject the exact administrator handoff.
  const normalized = inspection.expectedBranch === expected
    ? inspection
    : { ...inspection, expectedBranch: expected, onBoardBranch: inspection.actualBranch === expected };
  return refreshBoardBranch(status, expected, normalized);
}

/** Automatic sync is safe only while the live board is available and healthy. */
export function shouldRunAutomaticSync(status: Pick<KanmerGitStatus, "available" | "paused" | "branchMismatch">): boolean {
  return status.available && !status.paused && status.branchMismatch !== true;
}

/**
 * Timer creation shares the same safety predicate as timer execution, plus a
 * remote guard: the default interval (CORE-123) must not schedule a push that
 * has nowhere to go. `sync` absent means the remote was not inspected, which
 * preserves the pre-CORE-123 behaviour for callers that never attach it.
 */
export function shouldScheduleAutomaticSync(
  status: Pick<KanmerGitStatus, "available" | "paused" | "branchMismatch" | "sync">,
  minutes: number,
): boolean {
  return minutes > 0 && shouldRunAutomaticSync(status) && status.sync?.remote !== false;
}

export interface BoardSyncState {
  /** The board worktree has an `origin` remote to push to. */
  remote: boolean;
  /** Local board commits not on the last-fetched `origin/<branch>` (unpushed). */
  ahead: number;
  /** Remote commits not yet rebased into the local board. */
  behind: number;
  localSha: string | null;
  remoteSha: string | null;
}

/**
 * Observational twin of the MCP server's `get_status.boardSync`. Compares the
 * board HEAD with the last-fetched remote ref — it never fetches — so a stalled
 * auto-sync shows up as `ahead > 0` in Settings. Never throws.
 */
export async function inspectBoardSync(boardRoot: string, branch: string): Promise<BoardSyncState> {
  const probe = async (args: string[]): Promise<string | null> => {
    try { return (await git(boardRoot, args)) || null; } catch { return null; }
  };
  const remote = (await probe(["remote", "get-url", "origin"])) !== null;
  const localSha = await probe(["rev-parse", "--verify", "HEAD^{commit}"]);
  const remoteRef = `refs/remotes/origin/${branch}`;
  const remoteSha = remote ? await probe(["rev-parse", "--verify", `${remoteRef}^{commit}`]) : null;
  if (!localSha || !remoteSha) return { remote, ahead: 0, behind: 0, localSha, remoteSha };
  const counts = (await probe(["rev-list", "--left-right", "--count", `HEAD...${remoteRef}`])) ?? "0\t0";
  const [ahead = 0, behind = 0] = counts.split(/\s+/).map((value) => Number.parseInt(value, 10)).map((value) => (Number.isFinite(value) ? value : 0));
  return { remote, ahead, behind, localSha, remoteSha };
}

export type SyncFailureKind = "conflict" | "transient";

/**
 * A rebase that stopped on a real content conflict needs a human; everything
 * else (a dirty-tree refusal from a concurrent agent write, a network error, a
 * non-fast-forward push) is retried on the next tick. Pausing on the transient
 * class is what silently disabled auto-sync for hours (CORE-123 research).
 */
export function classifySyncFailure(message: string): SyncFailureKind {
  return /\bCONFLICT\b|could not apply|Resolve all conflicts|Merge conflict|conflict.*autostash|autostash.*conflict|rebase is in progress|rebase-merge/i.test(message)
    ? "conflict"
    : "transient";
}

/**
 * A branch preference must not move away from the protected default while no
 * Git board is open to carry out (or observe) the administrator handoff.
 * Retaining the last valid preference is the invalidation: a later project
 * open cannot silently demand a branch that was never migrated.
 */
export function guardGitBranchPreference(current: string, requested: string, hasOpenBoard: boolean): string {
  const next = requested.trim() || PROTECTED_BOARD_BRANCH;
  if (!hasOpenBoard && current === PROTECTED_BOARD_BRANCH && next !== PROTECTED_BOARD_BRANCH) return current;
  return next;
}

/**
 * A live mismatch is an incomplete administrator handoff, not permission to
 * run the protected refusal path against whatever branch happens to be live.
 */
export function shouldAttemptProtectedBranchRename(
  current: string,
  requested: string,
  hasProtectedOpenBoard: boolean,
  hasBranchMismatch: boolean,
): boolean {
  const next = requested.trim() || PROTECTED_BOARD_BRANCH;
  return !hasBranchMismatch && next !== current && current === PROTECTED_BOARD_BRANCH && hasProtectedOpenBoard;
}

/** A live mismatch blocks the ordinary rename path as well as protected refusal. */
export function shouldAttemptOrdinaryBranchRename(
  hasBranchMismatch: boolean,
  currentBranch: string,
  targetBranch: string,
): boolean {
  return !hasBranchMismatch && currentBranch !== targetBranch;
}

const empty = (branch: string, error: string | null = null): KanmerGitStatus => ({
  available: false, boardRoot: null, branch, lastSync: null, error, paused: false,
});

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd, windowsHide: true });
  return stdout.trim();
}

async function isGitRepository(root: string): Promise<string | null> {
  try { return await git(root, ["rev-parse", "--show-toplevel"]); } catch { return null; }
}

async function validBranch(root: string, branch: string): Promise<void> {
  if (!branch.trim()) throw new Error("Kanmer branch cannot be empty.");
  await git(root, ["check-ref-format", "--branch", branch]);
}

async function currentBranch(root: string): Promise<string | null> {
  try { return await git(root, ["symbolic-ref", "--short", "HEAD"]); } catch { return null; }
}

export interface BoardWorktreeInspection {
  path: string;
  expectedBranch: string;
  actualBranch: string | null;
  onBoardBranch: boolean;
}

/**
 * Observational twin of packages/mcp-server/src/index.ts's board branch probe.
 * Keep the small helpers paired but local: this Electron process and MCP need
 * Git independently, while core must remain free of Git subprocesses.
 */
export async function inspectBoardWorktree(
  boardRoot: string,
  expectedBranch = process.env.KANMER_BOARD_BRANCH?.trim() || PROTECTED_BOARD_BRANCH,
): Promise<BoardWorktreeInspection> {
  const expected = expectedBranch.trim() || PROTECTED_BOARD_BRANCH;
  const actualBranch = await currentBranch(boardRoot);
  return {
    path: resolve(boardRoot),
    expectedBranch: expected,
    actualBranch,
    onBoardBranch: actualBranch === expected,
  };
}

/**
 * Re-read the live board branch before any manual or automatic sync attempt.
 * The cached status branch is only an expectation; a paused handoff may have
 * changed the worktree while the GUI remained open.  Keep inspection and the
 * existing mismatch-state transition together so every sync caller shares the
 * same fail-closed boundary.
 */
export async function preflightBoardSync(status: KanmerGitStatus): Promise<KanmerGitStatus> {
  if (!status.available || !status.boardRoot) return status;
  const inspection = await inspectBoardWorktree(status.boardRoot, status.branch);
  return refreshBoardBranch(status, status.branch, inspection);
}

async function hasOrigin(root: string): Promise<boolean> {
  try { return (await git(root, ["remote"])).split("\n").includes("origin"); } catch { return false; }
}

async function onRemote(root: string, branch: string): Promise<boolean> {
  return git(root, ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`]).then(() => true).catch(() => false);
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// These files are derived board state, not ticket/source history. Keep one
// list for every board-worktree lifecycle path so a board that already exists
// gets the same protection as one created by this process.
const BOARD_WORKTREE_IGNORE = [
  ".kanmer/data/activity.jsonl",
  ".kanmer/data/sources/",
  // Lock ownership is process-local. Never commit a live lock, its owner
  // lease, or a quarantined stale inode into the shared board branch.
  ".kanmer/**/*.lock",
  ".kanmer/**/*.lock.owner-*",
  ".kanmer/**/*.lock.stale-*",
  // Atomic-write residue. An interrupted write leaves one behind, and
  // `git add -- .kanmer` on the sync timer would otherwise commit it.
  ".kanmer/**/.*.tmp-*",
];

export interface BranchRenameResult {
  /** Whether the worktree is now on `to`. */
  ok: boolean;
  /** The branch it was on, or null if it was not on one. */
  from: string | null;
  /** A warning when ok, the reason when not. */
  error: string | null;
}

/**
 * Move the board worktree onto a new branch name, in place (FRD-020 R5).
 *
 * `git branch -m` is the whole trick. The new branch *is* the old one, so no
 * commit is orphaned — which is the bug this fixes: creating a fresh branch
 * under the new name left the board's entire history stranded on the old one.
 * The worktree path never changes either, so MCP servers already registered
 * against `.worktrees/kanmer` keep resolving.
 *
 * Order matters on the remote: the new branch is pushed *before* any old-ref
 * cleanup. Custom-to-custom renames retain the old remote ref because this
 * process cannot update the repository's KANMER_BOARD_BRANCH variable; the
 * operator warning is the handoff point for that external change.
 *
 * Only the local rename is fatal. Once the worktree is on `to` the board works;
 * a remote that could not be updated is a warning to show, not a reason to
 * refuse the rename and leave the user with neither name applied.
 */
export async function renameBoardBranch(boardRoot: string, to: string): Promise<BranchRenameResult> {
  const from = await currentBranch(boardRoot);
  if (!from) {
    return { ok: false, from: null, error: `${boardRoot} is not on a branch; rename the board branch by hand.` };
  }
  if (from === to) return { ok: true, from, error: null };
  if (from === PROTECTED_BOARD_BRANCH) {
    return {
      ok: false,
      from,
      error: `Cannot rename protected board branch ${PROTECTED_BOARD_BRANCH} automatically. An authorized repository administrator must push ${to}, retarget branch protection and required checks to ${to}, confirm the old rule is removed, and rename each local board worktree before changing Kanmer's branch setting.`,
    };
  }
  try {
    await validBranch(boardRoot, to);
    await git(boardRoot, ["branch", "-m", to]);
  } catch (error) {
    return { ok: false, from, error: msg(error) };
  }
  if (!(await hasOrigin(boardRoot))) return { ok: true, from, error: null };
  try {
    await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${to}`]);
  } catch (error) {
    return {
      ok: true,
      from,
      error:
        `Renamed to ${to} locally, but pushing it failed: ${msg(error)}. ` +
        `After the remote handoff succeeds, update KANMER_BOARD_BRANCH to ${to} before deleting retained remote branch ${from}.`,
    };
  }
  if (from !== PROTECTED_BOARD_BRANCH) {
    return {
      ok: true,
      from,
      error: `Renamed and pushed ${to}; retained old remote branch ${from}. Update KANMER_BOARD_BRANCH to ${to}, then delete ${from}.`,
    };
  }
  if (await onRemote(boardRoot, from)) {
    try {
      await git(boardRoot, ["push", "origin", "--delete", from]);
    } catch (error) {
      return { ok: true, from, error: `Renamed and pushed ${to}, but the old remote branch ${from} could not be deleted: ${msg(error)}` };
    }
  }
  return { ok: true, from, error: null };
}

async function ensureBoardWorktreeIgnore(boardRoot: string): Promise<void> {
  await ensureIgnore(join(boardRoot, ".gitignore"), BOARD_WORKTREE_IGNORE);
}

async function hasHead(root: string): Promise<boolean> {
  return git(root, ["rev-parse", "--verify", "HEAD"]).then(() => true).catch(() => false);
}

const ORPHAN_MIGRATION_MARKER = ".kanmer-orphan-migration.pending";
const ORPHAN_MARKER_VERSION = 1;
const ORPHAN_MIGRATION_LOCK = ".kanmer-orphan-migration.lock";

/** Fingerprint the copied board tree without following symlinks. */
async function directoryFingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  const visit = async (current: string, relative: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryRelative = (relative ? `${relative}/` : "") + entry.name;
      const normalized = entryRelative.replaceAll("\\", "/");
      const kind = entry.isDirectory() ? "directory" : entry.isFile() ? "file" : entry.isSymbolicLink() ? "symlink" : "other";
      hash.update(`${kind}:${normalized}\0`);
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) await visit(entryPath, entryRelative);
      else if (entry.isFile()) hash.update(await readFile(entryPath));
      else if (entry.isSymbolicLink()) hash.update(await readlink(entryPath));
    }
  };
  await visit(root, "");
  return hash.digest("hex");
}

async function markOrphanMigration(boardRoot: string, sourceFingerprint: string): Promise<void> {
  try {
    await writeFile(
      join(boardRoot, ORPHAN_MIGRATION_MARKER),
      `${JSON.stringify({ version: ORPHAN_MARKER_VERSION, sourceFingerprint })}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

/** Finish an orphan board whose first ignore reconciliation stopped early. */
async function resumeOrphanMigrationUnlocked(repoRoot: string, boardRoot: string, branch: string): Promise<void> {
  const sourceBoard = join(repoRoot, ".kanmer");
  const marker = join(boardRoot, ORPHAN_MIGRATION_MARKER);
  const head = await hasHead(boardRoot);
  // A marker identifies a partial migration after a board commit. An unborn
  // attached worktree is also an orphan migration, including boards created
  // before the marker was introduced.
  if (!existsSync(marker) && head) return;
  if (!existsSync(sourceBoard)) {
    if (existsSync(marker)) await rm(marker, { force: true });
    return;
  }
  if (!existsSync(join(boardRoot, ".kanmer"))) throw new Error(`Orphan board data is missing: ${boardRoot}`);
  let expectedFingerprint: string;
  if (existsSync(marker)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(marker, "utf8"));
    } catch (error) {
      throw new Error(`Orphan migration marker is invalid: ${msg(error)}`);
    }
    if (
      !parsed || typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== ORPHAN_MARKER_VERSION ||
      typeof (parsed as { sourceFingerprint?: unknown }).sourceFingerprint !== "string"
    ) {
      throw new Error(`Orphan migration marker is invalid: ${marker}`);
    }
    expectedFingerprint = (parsed as { sourceFingerprint: string }).sourceFingerprint;
  } else if (!head) {
    // Older unborn orphan worktrees did not have a marker. Treat the copied
    // board tree as their recorded version, but still fail closed if source
    // state changed before cleanup.
    expectedFingerprint = await directoryFingerprint(join(boardRoot, ".kanmer"));
  } else {
    throw new Error(`Orphan migration marker is missing: ${marker}`);
  }
  const copiedFingerprint = await directoryFingerprint(join(boardRoot, ".kanmer"));
  if (copiedFingerprint !== expectedFingerprint) {
    throw new Error("Copied board version is not the recorded orphan source; refusing cleanup.");
  }
  if (!head) {
    await git(boardRoot, ["add", "--", ".kanmer", ".gitignore"]);
    await git(boardRoot, ["commit", "-m", "chore(kanmer): create shared board"]);
  }
  await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${branch}`]);
  // Preserve Git's dirty-worktree refusal before moving the source aside.
  // Quarantining first would hide a user's uncommitted board edits from
  // `git rm`, turning a safe pause into an apparently successful deletion.
  try {
    await git(repoRoot, ["diff", "--quiet", "HEAD", "--", ".kanmer"]);
  } catch {
    throw new Error("Source board changed during orphan migration; refusing cleanup.");
  }
  // Quarantine the exact source tree before the final fingerprint check. The
  // rename is the ownership boundary: a concurrent writer cannot modify the
  // tree we are about to remove, and a changed source path fails closed.
  const quarantine = join(repoRoot, `.kanmer-orphan-quarantine-${process.pid}-${Date.now()}`);
  await rename(sourceBoard, quarantine);
  let restored = false;
  try {
    const currentFingerprint = await directoryFingerprint(quarantine);
    if (currentFingerprint !== expectedFingerprint || existsSync(sourceBoard)) {
      throw new Error("Source board changed during orphan migration; refusing cleanup.");
    }
    await git(repoRoot, ["rm", "-r", "--ignore-unmatch", "--", ".kanmer"]);
    // `git rm` has just released this tree; on Windows the handles it held go
    // away asynchronously, so an immediate un-retried removal can fail
    // ENOTEMPTY and take the restore path below — turning a completed
    // migration into a retained quarantine (CORE-128).
    await removeTreeWithRetry(quarantine);
    await rm(marker, { force: true });
  } catch (error) {
    if (existsSync(quarantine) && !existsSync(sourceBoard)) {
      try {
        await rename(quarantine, sourceBoard);
        restored = true;
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "orphan migration cleanup and restore failed");
      }
    }
    if (!restored && existsSync(quarantine)) {
      throw new AggregateError([error, new Error(`Orphan source quarantine retained at ${quarantine}`)], "orphan migration cleanup refused");
    }
    throw error;
  }
}

/**
 * Backoff for the orphan-migration lock, ~32 s in total.
 *
 * The shared default (`DEFAULT_LOCK_RETRY_MS`, ~2.1 s) is sized for a board
 * *file* write. This critical section is a different order of work: `git
 * commit`, `git push`, `git diff`, `git rm`, a full directory fingerprint and a
 * tree removal. On Windows under load the holder routinely needs more than
 * 2.1 s, and a waiter that gave up then reported the migration unavailable even
 * though nothing had gone wrong — a lost race presented as a failure
 * (CORE-128). The budget is still bounded: a genuinely stuck holder is still
 * reported rather than waited on forever, and the lock's own stale-owner
 * recovery is unchanged.
 */
const ORPHAN_MIGRATION_LOCK_RETRY_MS = [10, 25, 60, 150, 300, 600, 1_000, 2_000, 3_000, 5_000, 5_000, 5_000, 5_000, 5_000] as const;

/** Serialize orphan source cleanup with writers using the shared file-lock semantics. */
async function resumeOrphanMigration(repoRoot: string, boardRoot: string, branch: string): Promise<void> {
  await withExclusiveFileLock(
    join(repoRoot, ".worktrees", ORPHAN_MIGRATION_LOCK),
    () => resumeOrphanMigrationUnlocked(repoRoot, boardRoot, branch),
    { retryDelaysMs: ORPHAN_MIGRATION_LOCK_RETRY_MS },
  );
}

/** Locate or initialise the canonical board worktree for a Git source root. */
export async function ensureBoardWorktree(sourceRoot: string, branch: string): Promise<KanmerGitStatus> {
  const repoRoot = await isGitRepository(sourceRoot);
  if (!repoRoot) return empty(branch);
  try {
    await validBranch(repoRoot, branch);
    const boardRoot = join(repoRoot, ".worktrees", "kanmer");
    const porcelain = await git(repoRoot, ["worktree", "list", "--porcelain"]);
    const records = porcelain.split("\n\n").map((r) => Object.fromEntries(r.split("\n").map((l) => { const [k, ...v] = l.split(" "); return [k, v.join(" ")]; })));
    const attached = records.find((r) => r.branch === `refs/heads/${branch}`)?.worktree;
    if (attached) {
      const attachedRoot = resolve(attached);
      try {
        await ensureBoardWorktreeIgnore(attachedRoot);
        await resumeOrphanMigration(repoRoot, attachedRoot, branch);
      } catch (error) {
        // The path is already the canonical board worktree. Keep it visible
        // while refusing to use it until the derived ignore state is repaired;
        // returning empty() here would let callers fall back to the source
        // checkout and mutate the wrong board.
        return { ...empty(branch, msg(error)), boardRoot: attachedRoot, paused: true };
      }
      return { available: true, boardRoot: attachedRoot, branch, lastSync: null, error: null, paused: false, sync: await inspectBoardSync(attachedRoot, branch) };
    }
    if (existsSync(boardRoot)) {
      // The worktree is here but not on `branch`. Almost always: the board
      // branch was renamed in Settings while this project was closed, so the
      // rename never reached it. Reconcile now rather than reporting a branch
      // this worktree is not actually on — that lie is what made the next sync
      // push the board somewhere nobody was looking.
      const renamed = await renameBoardBranch(boardRoot, branch);
      if (!renamed.ok) return { ...empty(branch, renamed.error), boardRoot: resolve(boardRoot), paused: true };
      try {
        await ensureBoardWorktreeIgnore(boardRoot);
      } catch (error) {
        // The rename already put the canonical worktree on the requested
        // branch. Keep its location visible while refusing to use it until
        // the derived ignore state is repaired; otherwise callers can fall
        // back to the source checkout and mutate the wrong board.
        return { ...empty(branch, msg(error)), boardRoot: resolve(boardRoot), paused: true };
      }
      try {
        await ensureIgnore(join(repoRoot, ".gitignore"), [".kanmer/", ".worktrees/"]);
      } catch (error) {
        return { ...empty(branch, msg(error)), boardRoot: resolve(boardRoot), paused: true };
      }
      return {
        available: true,
        boardRoot: resolve(boardRoot),
        branch,
        lastSync: null,
        error: renamed.error,
        paused: false,
        ...(renamed.error && renamed.from ? { handoffPending: { from: renamed.from, to: branch, warning: renamed.error } } : {}),
        sync: await inspectBoardSync(resolve(boardRoot), branch),
      };
    }
    const remoteExists = await git(repoRoot, ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`]).then(() => true).catch(() => false);
    const localExists = await git(repoRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]).then(() => true).catch(() => false);
    await mkdir(join(repoRoot, ".worktrees"), { recursive: true });
    const sourceBoard = join(repoRoot, ".kanmer");
    if (localExists) {
      await git(repoRoot, ["worktree", "add", boardRoot, branch]);
    } else if (remoteExists) {
      await git(repoRoot, ["fetch", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`]);
      await git(repoRoot, ["worktree", "add", "--track", "-b", branch, boardRoot, `origin/${branch}`]);
    } else {
      await git(repoRoot, ["worktree", "add", "--orphan", "-b", branch, boardRoot]);
      if (existsSync(sourceBoard)) {
        await cp(sourceBoard, join(boardRoot, ".kanmer"), { recursive: true });
        // Record the bytes actually copied into the board worktree. If the
        // source was edited while the copy ran, cleanup must compare against
        // this snapshot rather than silently deleting the newer source.
        const copiedFingerprint = await directoryFingerprint(join(boardRoot, ".kanmer"));
        await markOrphanMigration(boardRoot, copiedFingerprint);
      }
    }
    // Reconcile after every successful attachment, while keeping orphan
    // creation's ignore file in place before its initial board commit.
    try {
      await ensureBoardWorktreeIgnore(boardRoot);
    } catch (error) {
      // `worktree add` has already established the canonical path. Keep it
      // visible while refusing to use it until the derived ignore state is
      // repaired; returning empty() here would let callers fall back to the
      // source checkout and mutate the wrong board.
      return { ...empty(branch, msg(error)), boardRoot: resolve(boardRoot), paused: true };
    }
    if (!localExists && !remoteExists && existsSync(join(boardRoot, ".kanmer"))) {
      try {
        await resumeOrphanMigration(repoRoot, boardRoot, branch);
      } catch (error) {
        return { ...empty(branch, msg(error)), boardRoot: resolve(boardRoot), paused: true };
      }
    }
    try {
      await ensureIgnore(join(repoRoot, ".gitignore"), [".kanmer/", ".worktrees/"]);
    } catch (error) {
      return { ...empty(branch, msg(error)), boardRoot: resolve(boardRoot), paused: true };
    }
    return { available: true, boardRoot: resolve(boardRoot), branch, lastSync: null, error: null, paused: false, sync: await inspectBoardSync(resolve(boardRoot), branch) };
  } catch (error) {
    return empty(branch, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Commit/rebase/push only the canonical board worktree. Real conflicts
 * preserve local work and pause; transient failures (including the add→rebase
 * race with a concurrent agent write, CORE-123) leave the timer armed.
 */
/** Paths with unresolved merge entries (UU/AA/…) in the index; never throws. */
export async function unmergedPaths(root: string): Promise<string[]> {
  const out = await git(root, ["diff", "--name-only", "--diff-filter=U"]).catch(() => "");
  return out.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

async function rebaseInProgress(root: string): Promise<boolean> {
  for (const dirName of ["rebase-merge", "rebase-apply"]) {
    const path = await git(root, ["rev-parse", "--git-path", dirName]).catch(() => null);
    if (path && existsSync(resolve(root, path))) return true;
  }
  return false;
}

export async function syncBoard(status: KanmerGitStatus): Promise<KanmerGitStatus> {
  if (!status.available || !status.boardRoot) return status;
  const boardRoot = status.boardRoot;
  const stage = async (): Promise<void> => {
    await git(boardRoot, ["add", "--", ".kanmer", ".gitignore"]);
    const dirty = await git(boardRoot, ["diff", "--cached", "--quiet", "--", ".kanmer", ".gitignore"]).then(() => false).catch(() => true);
    if (dirty) await git(boardRoot, ["commit", "-m", `chore(kanmer): sync board ${new Date().toISOString()}`]);
  };
  try {
    await git(boardRoot, ["symbolic-ref", "--short", "HEAD"]);
    await stage();
    const remote = await git(boardRoot, ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${status.branch}`]).then(() => true).catch(() => false);
    if (remote) {
      await git(boardRoot, ["fetch", "origin", `+refs/heads/${status.branch}:refs/remotes/origin/${status.branch}`]);
      // Agents write .kanmer files continuously; anything that landed between
      // `add` and here would make a plain rebase refuse ("unstaged changes").
      // --autostash carries those writes across the rebase, and a second stage
      // pass commits them so the push below does not leave them behind.
      const stashBefore = await git(boardRoot, ["rev-parse", "-q", "--verify", "refs/stash"]).catch(() => "");
      try { await git(boardRoot, ["rebase", "--autostash", `origin/${status.branch}`]); }
      catch (e) { await git(boardRoot, ["rebase", "--abort"]).catch(() => undefined); throw e; }
      // `rebase --autostash` exits 0 even when re-applying the stash conflicts
      // ("Applying autostash resulted in conflicts"): the tree is left with
      // unmerged (UU) paths and the stash entry is kept. Staging now would
      // commit and push conflict markers into the shared board, so detect that
      // state, keep the tree as Git left it (the stash holds the local work;
      // no automatic `stash pop`/`checkout --merge`), and pause for a human.
      const unmerged = await unmergedPaths(boardRoot);
      const stashAfter = await git(boardRoot, ["rev-parse", "-q", "--verify", "refs/stash"]).catch(() => "");
      if (unmerged.length > 0 || (stashAfter !== "" && stashAfter !== stashBefore)) {
        if (await rebaseInProgress(boardRoot)) await git(boardRoot, ["rebase", "--abort"]).catch(() => undefined);
        throw new Error(
          `Applying autostash resulted in conflicts after rebase onto origin/${status.branch}` +
            (unmerged.length > 0 ? ` (unmerged: ${unmerged.join(", ")})` : "") +
            "; local board writes are kept in `git stash` and nothing was committed or pushed. Resolve in the board worktree, then retry.",
        );
      }
      await stage();
    }
    await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${status.branch}`]);
    return { ...status, lastSync: new Date().toISOString(), error: null, paused: false, sync: await inspectBoardSync(boardRoot, status.branch) };
  } catch (error) {
    // A new sync failure supersedes any handoff-generated state. If the
    // operator presses Retry while the worktree is still mismatched, the
    // resulting error must not be cleared by a later exact-destination refresh.
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...status,
      branchMismatchError: false,
      branchMismatchPause: false,
      error: message,
      paused: classifySyncFailure(message) === "conflict",
      sync: await inspectBoardSync(boardRoot, status.branch),
    };
  }
}

export async function removeBoardWorktree(boardRoot: string): Promise<void> {
  // A board worktree is normally being removed right after something stopped
  // reading it; Windows releases those handles asynchronously, so retry rather
  // than fail the removal (see AGENTS.md §8 gotcha 20).
  if (existsSync(boardRoot)) await removeTreeWithRetry(boardRoot);
}
