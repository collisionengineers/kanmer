# Research — CORE-055

## Finding

CORE-054 correctly marks a live worktree mismatch and suppresses the protected-default refusal predicate, but `applyGitPreferences` still has an ordinary rename loop. When the cached branch differs from the saved setting after a failed prior handoff, that loop can call `renameBoardBranch` despite `branchMismatch`, mutating refs/worktree state against the handoff contract.

## Reuse and scope

Reuse `refreshBoardBranch`'s existing `branchMismatch` signal and the existing Git preference flow. Add one small, named predicate beside `shouldAttemptProtectedBranchRename` for ordinary rename eligibility, make `applyGitPreferences` require no mismatch before either rename path, and extend the real-Git test seam with a cached-branch-different-from-preference case. No new Git commands, settings semantics, providers, or external protection claims.

## Expected behavior

A mismatch preserves the current saved branch preference, reports the paused/error mismatch, and skips both the protected refusal loop and the ordinary rename loop. The state remains available for a later administrator handoff. A non-mismatch retains existing rename behavior.

## Evidence boundary

Local temporary-repository/ref/worktree tests prove the no-mutation decision. Live GitHub protection retargeting and packaged GUI interaction remain INCONCLUSIVE.
