import type { BoardWorktreeInspection } from "./kanmerGit.js";

/** A live worktree is safe for automatic sync only on the saved branch. */
export function liveBoardBranchMatches(
  expectedBranch: string,
  inspection: Pick<BoardWorktreeInspection, "actualBranch" | "onBoardBranch">,
): boolean {
  return inspection.onBoardBranch && inspection.actualBranch === expectedBranch;
}

/** Stable, user-facing pause text for a live-branch safety refusal. */
export function liveBoardBranchError(
  expectedBranch: string,
  inspection: Pick<BoardWorktreeInspection, "actualBranch">,
): string {
  const actual = inspection.actualBranch ?? "detached or unavailable";
  return `Board worktree is on ${actual}; expected ${expectedBranch}. Complete the administrator handoff before changing Kanmer's branch setting.`;
}
