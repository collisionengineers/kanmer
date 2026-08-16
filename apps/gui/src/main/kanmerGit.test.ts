import { execFile as execFileCallback } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureBoardWorktree, renameBoardBranch } from "./kanmerGit.js";

const execFile = promisify(execFileCallback);
const git = async (cwd: string, ...args: string[]): Promise<string> =>
  (await execFile("git", args, { cwd, windowsHide: true })).stdout.trim();

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
  it("keeps the history, the path and the remote consistent", async () => {
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
    expect(resolve(boardRoot)).toBe(resolve(join(repo, ".worktrees", "kanmer")));
    expect(existsSync(join(boardRoot, ".kanmer", "version.json"))).toBe(true);

    // Old remote branch is gone, and only after the new one was pushed.
    expect(await remoteHeads()).not.toContain("kanmer-board");
  });

  it("is a no-op when the name already matches", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const result = await renameBoardBranch(created.boardRoot!, "kanmer-board");
    expect(result).toEqual({ ok: true, from: "kanmer-board", error: null });
    expect(await remoteHeads()).toContain("kanmer-board");
  });

  it("refuses a name that is already taken instead of clobbering it", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    await git(repo, "branch", "taken");

    const result = await renameBoardBranch(boardRoot, "taken");
    expect(result.ok).toBe(false);
    expect(result.from).toBe("kanmer-board");
    // Still on the old branch: a refused rename must not strand the board.
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("kanmer-board");
  });

  it("renames locally even with no remote to push to", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    await git(repo, "remote", "remove", "origin");

    const result = await renameBoardBranch(boardRoot, "solo-board");
    expect(result).toEqual({ ok: true, from: "kanmer-board", error: null });
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("solo-board");
  });
});

describe("ensureBoardWorktree reconciliation", () => {
  it("moves a worktree left on the old branch onto the configured one", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    const boardRoot = created.boardRoot!;
    const before = await git(boardRoot, "rev-parse", "HEAD");

    // The project was closed when the branch was renamed in Settings, so the
    // worktree never heard about it. Next open asks for the new name.
    const reopened = await ensureBoardWorktree(repo, "team-board");

    expect(reopened.available).toBe(true);
    expect(reopened.error).toBeNull();
    expect(resolve(reopened.boardRoot!)).toBe(resolve(boardRoot));
    expect(reopened.branch).toBe("team-board");
    expect(await git(boardRoot, "symbolic-ref", "--short", "HEAD")).toBe("team-board");
    expect(await git(boardRoot, "rev-parse", "HEAD")).toBe(before);
  });

  it("reports the branch the worktree is really on when reconciling fails", async () => {
    const created = await ensureBoardWorktree(repo, "kanmer-board");
    await git(repo, "branch", "taken");

    const reopened = await ensureBoardWorktree(repo, "taken");

    expect(reopened.available).toBe(false);
    expect(reopened.error).toBeTruthy();
    expect(await git(created.boardRoot!, "symbolic-ref", "--short", "HEAD")).toBe("kanmer-board");
  });

  it("is idempotent once the worktree is on the branch", async () => {
    const first = await ensureBoardWorktree(repo, "kanmer-board");
    const second = await ensureBoardWorktree(repo, "kanmer-board");
    expect(resolve(second.boardRoot!)).toBe(resolve(first.boardRoot!));
    expect(second.error).toBeNull();
    expect(await remoteHeads()).toEqual(expect.arrayContaining(["main", "kanmer-board"]));
  });
});
