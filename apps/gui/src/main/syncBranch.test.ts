import { describe, expect, it } from "vitest";
import { liveBoardBranchError, liveBoardBranchMatches } from "./syncBranch.js";

describe("live board branch guard", () => {
  it("accepts only the exact live branch", () => {
    expect(liveBoardBranchMatches("kanmer-board", { actualBranch: "kanmer-board", onBoardBranch: true })).toBe(true);
    expect(liveBoardBranchMatches("kanmer-board", { actualBranch: "other-board", onBoardBranch: false })).toBe(false);
    expect(liveBoardBranchMatches("kanmer-board", { actualBranch: null, onBoardBranch: false })).toBe(false);
  });

  it("names detached or unavailable worktrees in the refusal", () => {
    expect(liveBoardBranchError("kanmer-board", { actualBranch: null })).toContain("detached or unavailable");
    expect(liveBoardBranchError("kanmer-board", { actualBranch: "other-board" })).toContain("other-board");
  });
});
