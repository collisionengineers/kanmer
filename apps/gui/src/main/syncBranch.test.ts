import { describe, expect, it } from "vitest";
import { retryBoardBranch, bindRetryBoardStatus } from "./syncBranch.js";

const status = (patch: Partial<import("./kanmerGit.js").KanmerGitStatus> = {}): import("./kanmerGit.js").KanmerGitStatus => ({
  available: false,
  boardRoot: "C:/repo/.worktrees/kanmer",
  branch: "kanmer-board",
  lastSync: null,
  error: "ignore repair failed",
  paused: true,
  ...patch,
});

describe("retryBoardBranch", () => {
  it("uses the current saved setting instead of a stale paused status", () => {
    expect(retryBoardBranch("old-board", "new-board")).toBe("new-board");
  });

  it("keeps the paused status branch when no setting is available", () => {
    expect(retryBoardBranch("old-board", "")).toBe("old-board");
  });
});

describe("bindRetryBoardStatus", () => {
  it("accepts a retry that stays on the open board root", () => {
    const retried = status({ available: true, paused: false, error: null });
    expect(bindRetryBoardStatus("C:/repo/.worktrees/kanmer", status(), retried)).toBe(retried);
  });

  it("preserves the failed context when retry discovers another root", () => {
    const before = status();
    const retried = status({ available: true, boardRoot: "C:/other/.worktrees/kanmer", paused: false, error: null });

    expect(bindRetryBoardStatus("C:/repo/.worktrees/kanmer", before, retried)).toEqual({
      ...before,
      error: "Board retry refused a different board root: C:/other/.worktrees/kanmer (open context: C:/repo/.worktrees/kanmer).",
    });
  });

  it("keeps an unavailable retry bound to the open root", () => {
    const before = status();
    const retried = status({ boardRoot: null, error: "still unavailable" });
    expect(bindRetryBoardStatus("C:/repo/.worktrees/kanmer", before, retried)).toEqual({
      ...before,
      boardRoot: "C:/repo/.worktrees/kanmer",
      error: "still unavailable",
    });
  });
});
