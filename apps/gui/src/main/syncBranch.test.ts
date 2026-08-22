import { describe, expect, it } from "vitest";
import { retryBoardBranch } from "./syncBranch.js";

describe("retryBoardBranch", () => {
  it("uses the current saved setting instead of a stale paused status", () => {
    expect(retryBoardBranch("old-board", "new-board")).toBe("new-board");
  });

  it("keeps the paused status branch when no setting is available", () => {
    expect(retryBoardBranch("old-board", "")).toBe("old-board");
  });
});
