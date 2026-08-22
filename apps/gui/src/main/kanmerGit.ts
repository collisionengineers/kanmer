import { execFile as execFileCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export interface KanmerGitStatus {
  available: boolean;
  boardRoot: string | null;
  branch: string;
  lastSync: string | null;
  error: string | null;
  paused: boolean;
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
  expectedBranch = process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board",
): Promise<BoardWorktreeInspection> {
  const expected = expectedBranch.trim() || "kanmer-board";
  const actualBranch = await currentBranch(boardRoot);
  return {
    path: resolve(boardRoot),
    expectedBranch: expected,
    actualBranch,
    onBoardBranch: actualBranch === expected,
  };
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
 * Order matters on the remote: the new branch is pushed *before* the old one is
 * deleted, so a failure at any point still leaves the history published under
 * at least one name.
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
    return { ok: true, from, error: `Renamed to ${to} locally, but pushing it failed: ${msg(error)}` };
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

async function ensureIgnore(file: string, entries: string[]): Promise<void> {
  const before = existsSync(file) ? await readFile(file, "utf8") : "";
  const lines = before.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  let changed = false;
  for (const entry of entries) if (!lines.includes(entry)) { lines.push(entry); changed = true; }
  if (changed || !existsSync(file)) await writeFile(file, `${lines.join("\n")}\n`, "utf8");
}

async function ensureBoardWorktreeIgnore(boardRoot: string): Promise<void> {
  await ensureIgnore(join(boardRoot, ".gitignore"), BOARD_WORKTREE_IGNORE);
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
      await ensureBoardWorktreeIgnore(attachedRoot);
      return { available: true, boardRoot: attachedRoot, branch, lastSync: null, error: null, paused: false };
    }
    if (existsSync(boardRoot)) {
      // The worktree is here but not on `branch`. Almost always: the board
      // branch was renamed in Settings while this project was closed, so the
      // rename never reached it. Reconcile now rather than reporting a branch
      // this worktree is not actually on — that lie is what made the next sync
      // push the board somewhere nobody was looking.
      const renamed = await renameBoardBranch(boardRoot, branch);
      if (!renamed.ok) return { ...empty(branch, renamed.error), boardRoot: resolve(boardRoot) };
      await ensureBoardWorktreeIgnore(boardRoot);
      await ensureIgnore(join(repoRoot, ".gitignore"), [".kanmer/", ".worktrees/"]);
      return { available: true, boardRoot: resolve(boardRoot), branch, lastSync: null, error: renamed.error, paused: false };
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
      if (existsSync(sourceBoard)) await cp(sourceBoard, join(boardRoot, ".kanmer"), { recursive: true });
    }
    // Reconcile after every successful attachment, while keeping orphan
    // creation's ignore file in place before its initial board commit.
    await ensureBoardWorktreeIgnore(boardRoot);
    if (!localExists && !remoteExists && existsSync(join(boardRoot, ".kanmer"))) {
      await git(boardRoot, ["add", "--", ".kanmer", ".gitignore"]);
      await git(boardRoot, ["commit", "-m", "chore(kanmer): create shared board"]);
      await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${branch}`]);
      // The source cleanup is intentionally staged but never committed here:
      // its owner reviews it as part of their normal code-branch workflow.
      if (existsSync(sourceBoard)) await git(repoRoot, ["rm", "-r", "--ignore-unmatch", "--", ".kanmer"]);
    }
    await ensureIgnore(join(repoRoot, ".gitignore"), [".kanmer/", ".worktrees/"]);
    return { available: true, boardRoot: resolve(boardRoot), branch, lastSync: null, error: null, paused: false };
  } catch (error) {
    return empty(branch, error instanceof Error ? error.message : String(error));
  }
}

/** Commit/rebase/push only the canonical board worktree. Conflicts preserve local work and pause. */
export async function syncBoard(status: KanmerGitStatus): Promise<KanmerGitStatus> {
  if (!status.available || !status.boardRoot) return status;
  const boardRoot = status.boardRoot;
  try {
    await git(boardRoot, ["symbolic-ref", "--short", "HEAD"]);
    await git(boardRoot, ["add", "--", ".kanmer", ".gitignore"]);
    const dirty = await git(boardRoot, ["diff", "--cached", "--quiet", "--", ".kanmer", ".gitignore"]).then(() => false).catch(() => true);
    if (dirty) await git(boardRoot, ["commit", "-m", `chore(kanmer): sync board ${new Date().toISOString()}`]);
    const remote = await git(boardRoot, ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${status.branch}`]).then(() => true).catch(() => false);
    if (remote) {
      await git(boardRoot, ["fetch", "origin", `+refs/heads/${status.branch}:refs/remotes/origin/${status.branch}`]);
      try { await git(boardRoot, ["rebase", `origin/${status.branch}`]); }
      catch (e) { await git(boardRoot, ["rebase", "--abort"]).catch(() => undefined); throw e; }
    }
    await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${status.branch}`]);
    return { ...status, lastSync: new Date().toISOString(), error: null, paused: false };
  } catch (error) {
    return { ...status, error: error instanceof Error ? error.message : String(error), paused: true };
  }
}

export async function removeBoardWorktree(boardRoot: string): Promise<void> {
  if (existsSync(boardRoot)) await rm(boardRoot, { recursive: true, force: true });
}
