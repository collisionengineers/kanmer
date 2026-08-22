import { resolve } from "node:path";
import type { KanmerGitStatus } from "./kanmerGit.js";

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
