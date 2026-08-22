import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureBoardWorktree, ignoreEntriesToAppend, inspectBoardWorktree, renameBoardBranch, syncBoard } from "./kanmerGit.js";

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
  it("selects only missing or re-invalidated rules for an append-only merge", () => {
    const before = "# human rule\n.kanmer/data/sources/\n!.kanmer/data/sources/cache.json\ncustom-human-rule\n";
    expect(ignoreEntriesToAppend(before, [".kanmer/data/sources/"])).toEqual([".kanmer/data/sources/"]);
    expect(ignoreEntriesToAppend("# human rule\n.kanmer/data/sources/\n", [".kanmer/data/sources/"])).toEqual([]);
  });

  realGitTest("writes the sources cache rule when creating a board worktree", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const ignore = readFileSync(join(created.boardRoot!, ".gitignore"), "utf8");

    expect(ignore).toContain(".kanmer/data/sources/\n");
    expect(ignore.match(/^\.kanmer\/data\/sources\/$/gm)).toHaveLength(1);
  });

  realGitTest("refuses a symlinked board ignore path without touching its target", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const ignorePath = join(boardRoot, ".gitignore");
    const target = join(repo, "redirect-target.txt");
    writeFileSync(target, "sentinel\n", "utf8");
    rmSync(ignorePath);
    symlinkSync(target, ignorePath, "file");

    const refused = await ensureBoardWorktree(repo, "kanmer-board");

    expect(refused.available).toBe(false);
    expect(refused.boardRoot).toBe(resolve(boardRoot));
    expect(refused.paused).toBe(true);
    expect(refused.error).toContain("Refusing symlinked board ignore path");
    expect(readFileSync(target, "utf8")).toBe("sentinel\n");
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

  realGitTest("puts managed cache exclusions after later negations", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const ignorePath = join(created.boardRoot!, ".gitignore");
    writeFileSync(ignorePath, "!.kanmer/data/sources/cache.json\n.kanmer/data/sources/\n", "utf8");

    const reopened = await ensureBoardWorktree(repo, "kanmer-board");
    const lines = readFileSync(join(reopened.boardRoot!, ".gitignore"), "utf8").trim().split("\n");

    expect(lines.at(-1)).toBe(".kanmer/**/.*.tmp-*");
    expect(lines.lastIndexOf(".kanmer/data/sources/")).toBeLessThan(lines.length - 1);
    expect(await git(reopened.boardRoot!, "check-ignore", "--no-index", ".kanmer/data/sources/cache.json"))
      .toContain(".kanmer/data/sources/");
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

  realGitTest("resumes orphan migration when an attached orphan has no commit", async () => {
    const boardRoot = join(repo, ".worktrees", "kanmer");
    mkdirSync(join(repo, ".worktrees"), { recursive: true });
    await git(repo, "worktree", "add", "--orphan", "-b", "orphan-board", boardRoot);
    mkdirSync(join(boardRoot, ".kanmer"), { recursive: true });
    writeFileSync(join(boardRoot, ".kanmer", "version.json"), '{"format":3}\n', "utf8");

    const resumed = await ensureBoardWorktree(repo, "orphan-board");
    const head = await git(boardRoot, "rev-parse", "--verify", "HEAD");

    expect(resumed.available).toBe(true);
    expect(head).toBeTruthy();
    expect(await git(origin, "rev-parse", "orphan-board")).toBe(head);
    expect(existsSync(join(repo, ".kanmer"))).toBe(false);
  });

  realGitTest("preserves source edits when an orphan version conflicts before cleanup", async () => {
    const boardRoot = join(repo, ".worktrees", "kanmer");
    await git(repo, "worktree", "add", "--orphan", "-b", "orphan-version-conflict", boardRoot);
    mkdirSync(join(boardRoot, ".kanmer"), { recursive: true });
    writeFileSync(join(boardRoot, ".kanmer", "version.json"), '{"format":3}\n', "utf8");

    const sourceVersion = join(repo, ".kanmer", "version.json");
    writeFileSync(sourceVersion, '{"format":99}\n', "utf8");

    const refused = await ensureBoardWorktree(repo, "orphan-version-conflict");
    const expectedRoot = pathIdentity(resolve(repo, ".worktrees", "kanmer"));

    expect(refused.available).toBe(false);
    expect(refused.boardRoot).toBe(expectedRoot);
    expect(refused.paused).toBe(true);
    expect(refused.error).toContain("Source board changed during orphan migration");
    expect(readFileSync(sourceVersion, "utf8")).toBe('{"format":99}\n');
    expect(readFileSync(join(boardRoot, ".kanmer", "version.json"), "utf8")).toBe('{"format":3}\n');
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("orphan-version-conflict");
  });

  realGitTest("preserves source after an orphan cleanup retry sees a changed version", async () => {
    const sourceVersion = join(repo, ".kanmer", "version.json");
    writeFileSync(sourceVersion, '{"format":99}\n', "utf8");

    const first = await ensureBoardWorktree(repo, "orphan-cleanup-retry");
    const boardRoot = pathIdentity(resolve(repo, ".worktrees", "kanmer"));
    expect(first.available).toBe(false);
    expect(first.boardRoot).toBe(boardRoot);
    expect(first.paused).toBe(true);
    expect(await git(boardRoot, "rev-parse", "HEAD")).toBeTruthy();
    expect(await git(origin, "rev-parse", "orphan-cleanup-retry")).toBeTruthy();
    expect(existsSync(join(repo, ".kanmer"))).toBe(true);

    // Restoring a different source version must not allow the retry to delete
    // source state that no longer matches the copied board snapshot.
    writeFileSync(sourceVersion, '{"format":3}\n', "utf8");
    const retried = await ensureBoardWorktree(repo, "orphan-cleanup-retry");
    expect(retried).toMatchObject({ available: false, boardRoot: boardRoot, branch: "orphan-cleanup-retry", paused: true });
    expect(retried.error).toContain("Source board changed during orphan migration");
    expect(existsSync(join(repo, ".kanmer"))).toBe(true);
    expect(existsSync(join(boardRoot, ".kanmer-orphan-migration.pending"))).toBe(true);
  });

  realGitTest("serializes concurrent orphan cleanup and leaves no quarantine residue", async () => {
    const boardRoot = join(repo, ".worktrees", "kanmer");
    await git(repo, "worktree", "add", "--orphan", "-b", "orphan-concurrent-cleanup", boardRoot);
    mkdirSync(join(boardRoot, ".kanmer"), { recursive: true });
    writeFileSync(join(boardRoot, ".kanmer", "version.json"), '{"format":3}\n', "utf8");

    const results = await Promise.all([
      ensureBoardWorktree(repo, "orphan-concurrent-cleanup"),
      ensureBoardWorktree(repo, "orphan-concurrent-cleanup"),
    ]);
    expect(results.every((result) => result.available)).toBe(true);
    expect(existsSync(join(repo, ".kanmer"))).toBe(false);
    expect(readdirSync(repo).filter((entry) => entry.startsWith(".kanmer-orphan-quarantine-")).length).toBe(0);
  });

  realGitTest("preserves the root when first-time local attachment ignore fails", async () => {
    await git(repo, "checkout", "-b", "local-broken-ignore");
    mkdirSync(join(repo, ".gitignore"));
    writeFileSync(join(repo, ".gitignore", "blocked"), "directory", "utf8");
    await git(repo, "add", "--", ".gitignore/blocked");
    await git(repo, "commit", "-m", "fixture: broken board ignore path");
    await git(repo, "checkout", "main");

    const attached = await ensureBoardWorktree(repo, "local-broken-ignore");
    const expectedRoot = pathIdentity(resolve(repo, ".worktrees", "kanmer"));
    expect(attached.available).toBe(false);
    expect(attached.boardRoot).toBe(expectedRoot);
    expect(attached.branch).toBe("local-broken-ignore");
    expect(attached.paused).toBe(true);
    expect(attached.error).toBeTruthy();
    expect(await git(expectedRoot, "symbolic-ref", "--short", "HEAD")).toBe("local-broken-ignore");
  });

  realGitTest("retains the canonical root when source ignore reconciliation refuses", async () => {
    const target = join(dir, "source-ignore-target.txt");
    writeFileSync(target, "sentinel\n", "utf8");
    symlinkSync(target, join(repo, ".gitignore"), "file");

    const attached = await ensureBoardWorktree(repo, "source-ignore-symlink");
    const expectedRoot = pathIdentity(resolve(repo, ".worktrees", "kanmer"));

    expect(attached.available).toBe(false);
    expect(attached.boardRoot).toBe(expectedRoot);
    expect(attached.branch).toBe("source-ignore-symlink");
    expect(attached.paused).toBe(true);
    expect(attached.error).toContain("Refusing symlinked board ignore path");
    expect(await git(expectedRoot, "symbolic-ref", "--short", "HEAD")).toBe("source-ignore-symlink");
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

  realGitTest("preserves the root when first-time remote attachment ignore fails", async () => {
    await git(repo, "checkout", "-b", "remote-broken-ignore");
    mkdirSync(join(repo, ".gitignore"));
    writeFileSync(join(repo, ".gitignore", "blocked"), "directory", "utf8");
    await git(repo, "add", "--", ".gitignore/blocked");
    await git(repo, "commit", "-m", "fixture: broken remote ignore path");
    await git(repo, "push", "origin", "remote-broken-ignore");
    await git(repo, "checkout", "main");
    await git(repo, "branch", "-D", "remote-broken-ignore");

    const attached = await ensureBoardWorktree(repo, "remote-broken-ignore");
    const expectedRoot = pathIdentity(resolve(repo, ".worktrees", "kanmer"));
    expect(attached.available).toBe(false);
    expect(attached.boardRoot).toBe(expectedRoot);
    expect(attached.branch).toBe("remote-broken-ignore");
    expect(attached.paused).toBe(true);
    expect(attached.error).toBeTruthy();
    expect(await git(expectedRoot, "symbolic-ref", "--short", "HEAD")).toBe("remote-broken-ignore");
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

  realGitTest("retries a failed attached reconciliation in place after repair", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const ignorePath = join(boardRoot, ".gitignore");
    rmSync(ignorePath);
    mkdirSync(ignorePath);

    const failed = await ensureBoardWorktree(repo, "kanmer-board");
    expect(failed.available).toBe(false);
    expect(failed.boardRoot).toBe(resolve(boardRoot));
    expect(failed.paused).toBe(true);
    expect(failed.error).toBeTruthy();

    // Repair the same canonical path; retry must not create or select another
    // worktree and a repeated retry must remain idempotent.
    rmSync(ignorePath, { recursive: true, force: true });
    const retried = await ensureBoardWorktree(repo, "kanmer-board");
    expect(retried).toMatchObject({ available: true, boardRoot: resolve(boardRoot), branch: "kanmer-board", error: null, paused: false });
    const repeated = await ensureBoardWorktree(repo, "kanmer-board");
    expect(repeated).toMatchObject({ available: true, boardRoot: resolve(boardRoot), branch: "kanmer-board", error: null, paused: false });
    expect(readFileSync(ignorePath, "utf8")).toContain(".kanmer/data/sources/\n");
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

  realGitTest("keeps board lock ownership and quarantine artifacts out of sync", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const data = join(created.boardRoot!, ".kanmer", "data");
    mkdirSync(data, { recursive: true });
    writeFileSync(join(data, "board.yml"), "statuses: []\n", "utf8");
    const artifacts = [
      ".kanmer/data/board.yml.lock",
      ".kanmer/data/board.yml.lock.owner-123e4567-e89b-12d3-a456-426614174000",
      ".kanmer/data/board.yml.lock.stale-123-1",
    ];
    for (const relative of artifacts) writeFileSync(join(created.boardRoot!, relative), "operational\n", "utf8");

    for (const relative of artifacts) {
      expect(await git(created.boardRoot!, "check-ignore", "--no-index", relative)).toContain(relative);
    }
    const synced = await syncBoard(created);
    expect(synced.paused).toBe(false);
    expect(await git(created.boardRoot!, "ls-files", "--", ...artifacts)).toBe("");
    expect(await git(created.boardRoot!, "ls-files", ".kanmer/data/board.yml")).toContain(".kanmer/data/board.yml");
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

  realGitTest("preserves the board root when rename succeeds before ignore reconciliation fails", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const ignorePath = join(boardRoot, ".gitignore");
    rmSync(ignorePath);
    // A directory at the ignore-file path deterministically fails the
    // existing read/write reconciliation seam without relying on timing or
    // host-specific permission/lock behavior.
    mkdirSync(ignorePath);

    const reopened = await ensureBoardWorktree(repo, "team-board");

    expect(reopened.available).toBe(false);
    expect(reopened.boardRoot).toBe(resolve(boardRoot));
    expect(reopened.branch).toBe("team-board");
    expect(reopened.paused).toBe(true);
    expect(reopened.error).toBeTruthy();
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("team-board");
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
