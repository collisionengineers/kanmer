/** Select the branch a paused board retry should reconcile. */
export function retryBoardBranch(statusBranch: string, savedBranch: string): string {
  return savedBranch.trim() || statusBranch;
}
