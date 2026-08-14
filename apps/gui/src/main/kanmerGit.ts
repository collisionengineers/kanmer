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

async function ensureIgnore(file: string, entries: string[]): Promise<void> {
  const before = existsSync(file) ? await readFile(file, "utf8") : "";
  const lines = before.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  let changed = false;
  for (const entry of entries) if (!lines.includes(entry)) { lines.push(entry); changed = true; }
  if (changed || !existsSync(file)) await writeFile(file, `${lines.join("\n")}\n`, "utf8");
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
    if (attached) return { available: true, boardRoot: resolve(attached), branch, lastSync: null, error: null, paused: false };
    if (!existsSync(boardRoot)) {
      const remoteExists = await git(repoRoot, ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`]).then(() => true).catch(() => false);
      const localExists = await git(repoRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]).then(() => true).catch(() => false);
      await mkdir(join(repoRoot, ".worktrees"), { recursive: true });
      if (localExists) {
        await git(repoRoot, ["worktree", "add", boardRoot, branch]);
      } else if (remoteExists) {
        await git(repoRoot, ["fetch", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`]);
        await git(repoRoot, ["worktree", "add", "--track", "-b", branch, boardRoot, `origin/${branch}`]);
      } else {
        await git(repoRoot, ["worktree", "add", "--orphan", "-b", branch, boardRoot]);
        const sourceBoard = join(repoRoot, ".kanmer");
        if (existsSync(sourceBoard)) await cp(sourceBoard, join(boardRoot, ".kanmer"), { recursive: true });
        await ensureIgnore(join(boardRoot, ".gitignore"), [".kanmer/data/activity.jsonl"]);
        if (existsSync(join(boardRoot, ".kanmer"))) {
          await git(boardRoot, ["add", "--", ".kanmer", ".gitignore"]);
          await git(boardRoot, ["commit", "-m", "chore(kanmer): create shared board"]);
          await git(boardRoot, ["push", "-u", "origin", `HEAD:refs/heads/${branch}`]);
          // The source cleanup is intentionally staged but never committed here:
          // its owner reviews it as part of their normal code-branch workflow.
          if (existsSync(sourceBoard)) await git(repoRoot, ["rm", "-r", "--ignore-unmatch", "--", ".kanmer"]);
        }
      }
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
