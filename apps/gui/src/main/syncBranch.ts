import { resolve } from "node:path";
import type { BoardWorktreeInspection, KanmerGitStatus } from "./kanmerGit.js";

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

/** Select the branch a paused board retry should reconcile. */
export function retryBoardBranch(statusBranch: string, savedBranch: string): string {
  return savedBranch.trim() || statusBranch;
}

/**
 * Keep a retry bound to the board root already owned by the open context.
 *
 * A retry may discover another worktree (for example after a branch setting
 * changes). The store and watcher are still attached to the context's root,
 * so adopting that result would make sync and status operate on different
 * boards. Preserve the prior paused status and root until the project is
 * rebuilt explicitly.
 */
export function bindRetryBoardStatus(
  openBoardRoot: string,
  before: KanmerGitStatus,
  retried: KanmerGitStatus,
): KanmerGitStatus {
  if (!retried.boardRoot) {
    return {
      ...before,
      available: false,
      boardRoot: openBoardRoot,
      paused: true,
      error: retried.error ?? "Board retry returned no board root; keeping the open context paused.",
    };
  }
  if (resolve(retried.boardRoot) === resolve(openBoardRoot)) return retried;
  return {
    ...before,
    available: false,
    boardRoot: openBoardRoot,
    paused: true,
    error: `Board retry refused a different board root: ${retried.boardRoot} (open context: ${openBoardRoot}).`,
  };
}
