import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureBoardWorktree, inspectBoardWorktree, renameBoardBranch, syncBoard } from "./kanmerGit.js";

// These are deliberately real-Git integration tests: every case initialises a
// local repository and several create worktrees/remotes. Windows process and
// filesystem latency routinely exceeds Vitest's five-second unit-test budget;
// keep that larger, bounded budget scoped to this file rather than weakening
// the GUI suite's global default for pure tests.
const REAL_GIT_TEST_TIMEOUT_MS = 30_000;

const execFile = promisify(execFileCallback);
const git = async (cwd: string, ...args: string[]): Promise<string> =>
  (await execFile("git", args, {
    cwd,
    windowsHide: true,
    // Fixtures are entirely local; Git must never wait for interactive
    // credentials or prompts if a regression accidentally reaches one.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  })).stdout.trim();

/** One serial, bounded integration-test wrapper for the real Git fixture. */
const realGitTest = (name: string, fn: () => Promise<void>): void => {
  it(name, fn, REAL_GIT_TEST_TIMEOUT_MS);
};

/** Compare filesystem identity, not Windows' short/long path spelling. */
const pathIdentity = (input: string): string => {
  const resolved = resolve(input);
  if (process.platform !== "win32") return resolved;
  try {
    return realpathSync.native(resolved);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR") return resolved;
    throw error;
  }
};

/**
 * These tests drive real Git. The bug they cover (FRD-020 R5) is entirely about
 * which refs exist afterwards, so mocking the commands would only assert that
 * this file calls the commands this file calls.
 */
let dir: string;
let origin: string;
let repo: string;

async function commit(root: string, name: string): Promise<void> {
  writeFileSync(join(root, name), name, "utf8");
  await git(root, "add", "--", name);
  await git(root, "commit", "-m", name);
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "kanmer-git-"));
  origin = join(dir, "origin.git");
  repo = join(dir, "repo");
  mkdirSync(repo, { recursive: true });
  await git(dir, "init", "--bare", "--initial-branch=main", origin);
  await git(dir, "init", "--initial-branch=main", repo);
  await git(repo, "config", "user.email", "test@example.com");
  await git(repo, "config", "user.name", "Test");
  await git(repo, "remote", "add", "origin", origin);
  await commit(repo, "README.md");
  await git(repo, "push", "-u", "origin", "main");
  // A board to migrate, so ensureBoardWorktree takes its orphan-create path.
  mkdirSync(join(repo, ".kanmer"), { recursive: true });
  writeFileSync(join(repo, ".kanmer", "version.json"), '{"format":3}\n', "utf8");
  await git(repo, "add", "--", ".kanmer");
  await git(repo, "commit", "-m", "board");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

const remoteHeads = async (): Promise<string[]> =>
  (await git(origin, "for-each-ref", "--format=%(refname:short)", "refs/heads"))
    .split("\n")
    .filter(Boolean);

describe("renameBoardBranch", () => {
  realGitTest("keeps the history, the path and the remote consistent", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    expect(created.available).toBe(true);
    const boardRoot = created.boardRoot!;
    const before = await git(boardRoot, "rev-parse", "HEAD");
    expect(await remoteHeads()).toContain("kanmer-board");

    const renamed = await renameBoardBranch(boardRoot, "team-board");
    expect(renamed).toEqual({ ok: true, from: "kanmer-board", error: null });

    // The commits moved with the name — this is the actual bug: a fresh branch
    // under the new name would have left `before` unreachable from it.
    expect(await git(boardRoot, "rev-parse", "HEAD")).toBe(before);
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("team-board");
    expect(await git(origin, "rev-parse", "team-board")).toBe(before);

    // Path unchanged, so an already-registered MCP server still resolves.
    // Hosted Windows Git may spell the same temp root with an 8.3 alias.
    expect(pathIdentity(boardRoot)).toBe(pathIdentity(join(repo, ".worktrees", "kanmer")));
    expect(existsSync(join(boardRoot, ".kanmer", "version.json"))).toBe(true);

    // Old remote branch is gone, and only after the new one was pushed.
    expect(await remoteHeads()).not.toContain("kanmer-board");
  });

  realGitTest("is a no-op when the name already matches", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const result = await renameBoardBranch(created.boardRoot!, "kanmer-board");
    expect(result).toEqual({ ok: true, from: "kanmer-board", error: null });
    expect(await remoteHeads()).toContain("kanmer-board");
  });

  realGitTest("refuses a name that is already taken instead of clobbering it", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    await git(repo, "branch", "taken");

    const result = await renameBoardBranch(boardRoot, "taken");
    expect(result.ok).toBe(false);
    expect(result.from).toBe("kanmer-board");
    // Still on the old branch: a refused rename must not strand the board.
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("kanmer-board");
  });

  realGitTest("renames locally even with no remote to push to", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    await git(repo, "remote", "remove", "origin");

    const result = await renameBoardBranch(boardRoot, "solo-board");
    expect(result).toEqual({ ok: true, from: "kanmer-board", error: null });
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("solo-board");
  });
});

describe("inspectBoardWorktree", () => {
  realGitTest("reports a board on its expected branch", async () => {
    await expect(inspectBoardWorktree(repo, "main")).resolves.toEqual({
      path: resolve(repo), expectedBranch: "main", actualBranch: "main", onBoardBranch: true,
    });
  });

  realGitTest("reports a wrong branch without repairing it", async () => {
    await expect(inspectBoardWorktree(repo, "kanmer-board")).resolves.toEqual({
      path: resolve(repo), expectedBranch: "kanmer-board", actualBranch: "main", onBoardBranch: false,
    });
    expect(await git(repo, "symbolic-ref", "--short", "HEAD")).toBe("main");
  });

  realGitTest("reports an unavailable or detached board as unhealthy", async () => {
    const missing = join(dir, "missing-board");
    await expect(inspectBoardWorktree(missing, "kanmer-board")).resolves.toEqual({
      path: resolve(missing), expectedBranch: "kanmer-board", actualBranch: null, onBoardBranch: false,
    });
  });

  realGitTest("reports a detached board without changing its HEAD, refs, or worktrees", async () => {
    await git(repo, "checkout", "--detach", await git(repo, "rev-parse", "HEAD"));
    // Capture after the fixture deliberately detaches HEAD: these are the
    // facts inspection must leave exactly as it finds them.
    const beforeHead = await git(repo, "rev-parse", "HEAD");
    const beforeRefs = await git(repo, "show-ref");
    const beforeWorktrees = await git(repo, "worktree", "list", "--porcelain");

    await expect(inspectBoardWorktree(repo, "kanmer-board")).resolves.toEqual({
      path: resolve(repo), expectedBranch: "kanmer-board", actualBranch: null, onBoardBranch: false,
    });

    expect(await git(repo, "rev-parse", "HEAD")).toBe(beforeHead);
    expect(await git(repo, "show-ref")).toBe(beforeRefs);
    expect(await git(repo, "worktree", "list", "--porcelain")).toBe(beforeWorktrees);
  });

  realGitTest("uses the environment default and permits an explicit override", async () => {
    const before = process.env.KANMER_BOARD_BRANCH;
    process.env.KANMER_BOARD_BRANCH = " main ";
    try {
      expect((await inspectBoardWorktree(repo)).expectedBranch).toBe("main");
      expect((await inspectBoardWorktree(repo, "kanmer-board")).expectedBranch).toBe("kanmer-board");
    } finally {
      if (before === undefined) delete process.env.KANMER_BOARD_BRANCH;
      else process.env.KANMER_BOARD_BRANCH = before;
    }
  });
});

describe("ensureBoardWorktree reconciliation", () => {
  realGitTest("writes the sources cache rule when creating a board worktree", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const ignore = readFileSync(join(created.boardRoot!, ".gitignore"), "utf8");

    expect(ignore).toContain(".kanmer/data/sources/\n");
    expect(ignore.match(/^\.kanmer\/data\/sources\/$/gm)).toHaveLength(1);
  });

  realGitTest("reconciles the sources cache rule on an existing board worktree", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const ignorePath = join(created.boardRoot!, ".gitignore");
    writeFileSync(ignorePath, ".kanmer/data/activity.jsonl\n", "utf8");

    const reopened = await ensureBoardWorktree(repo, "kanmer-board");
    const ignore = readFileSync(join(reopened.boardRoot!, ".gitignore"), "utf8");

    expect(ignore).toContain(".kanmer/data/sources/\n");
    expect(ignore.match(/^\.kanmer\/data\/sources\/$/gm)).toHaveLength(1);
  });

  realGitTest("reconciles the sources cache rule after attaching an existing local branch", async () => {
    await git(repo, "branch", "local-board");

    const attached = await ensureBoardWorktree(repo, "local-board");
    expect(attached.available).toBe(true);
    const ignore = readFileSync(join(attached.boardRoot!, ".gitignore"), "utf8");

    expect(ignore).toContain(".kanmer/data/sources/\n");
    expect(ignore.match(/^\.kanmer\/data\/sources\/$/gm)).toHaveLength(1);
    expect(await git(attached.boardRoot!, "check-ignore", "--no-index", ".kanmer/data/sources/cache.json"))
      .toContain(".kanmer/data/sources/cache.json");
  });

  realGitTest("reconciles the sources cache rule after attaching an existing remote branch", async () => {
    await git(repo, "branch", "remote-board");
    await git(repo, "push", "origin", "remote-board");
    await git(repo, "branch", "-D", "remote-board");

    const attached = await ensureBoardWorktree(repo, "remote-board");
    expect(attached.available).toBe(true);
    const ignore = readFileSync(join(attached.boardRoot!, ".gitignore"), "utf8");

    expect(ignore).toContain(".kanmer/data/sources/\n");
    expect(ignore.match(/^\.kanmer\/data\/sources\/$/gm)).toHaveLength(1);
    expect(await git(attached.boardRoot!, "check-ignore", "--no-index", ".kanmer/data/sources/cache.json"))
      .toContain(".kanmer/data/sources/cache.json");
  });

  realGitTest("preserves the attached board root when ignore reconciliation fails", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const ignorePath = join(boardRoot, ".gitignore");
    rmSync(ignorePath);
    // A directory at the ignore-file path makes the existing read/write seam
    // fail deterministically on every supported host without a timing-based
    // file lock or permission assumption.
    mkdirSync(ignorePath);

    const reopened = await ensureBoardWorktree(repo, "kanmer-board");

    expect(reopened.available).toBe(false);
    expect(reopened.boardRoot).toBe(resolve(boardRoot));
    expect(reopened.paused).toBe(true);
    expect(reopened.error).toBeTruthy();
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("kanmer-board");
  });

  realGitTest("keeps derived source cache out of the board sync", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const cache = join(created.boardRoot!, ".kanmer", "data", "sources", "cache.json");
    mkdirSync(join(created.boardRoot!, ".kanmer", "data", "sources"), { recursive: true });
    writeFileSync(cache, "derived", "utf8");

    expect(await git(created.boardRoot!, "check-ignore", "--no-index", ".kanmer/data/sources/cache.json"))
      .toContain(".kanmer/data/sources/cache.json");
    const synced = await syncBoard(created);

    expect(synced.paused).toBe(false);
    expect(await git(created.boardRoot!, "ls-files", ".kanmer/data/sources/cache.json")).toBe("");
  });

  realGitTest("moves a worktree left on the old branch onto the configured one", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const before = await git(boardRoot, "rev-parse", "HEAD");

    // The project was closed when the branch was renamed in Settings, so the
    // worktree never heard about it. Next open asks for the new name.
    const reopened = await ensureBoardWorktree(repo, "team-board");

    expect(reopened.available).toBe(true);
    expect(reopened.error).toBeNull();
    expect(pathIdentity(reopened.boardRoot!)).toBe(pathIdentity(boardRoot));
    expect(reopened.branch).toBe("team-board");
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("team-board");
    expect(await git(boardRoot, "rev-parse", "HEAD")).toBe(before);
    expect(readFileSync(join(boardRoot, ".gitignore"), "utf8")).toContain(".kanmer/data/sources/\n");
  });

  realGitTest("reports the branch the worktree is really on when reconciling fails", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    await git(repo, "branch", "taken");

    const reopened = await ensureBoardWorktree(repo, "taken");

    expect(reopened.available).toBe(false);
    expect(reopened.error).toBeTruthy();
    expect(await git(created.boardRoot!, "symbolic-ref", "--short", "HEAD")).toBe("kanmer-board");
  });

  realGitTest("is idempotent once the worktree is on the branch", async () => {
    const first = await ensureBoardWorktree(repo, "kanmer-board");
    const second = await ensureBoardWorktree(repo, "kanmer-board");
    expect(pathIdentity(second.boardRoot!)).toBe(pathIdentity(first.boardRoot!));
    expect(second.error).toBeNull();
    expect(await remoteHeads()).toEqual(expect.arrayContaining(["main", "kanmer-board"]));
  });
});
