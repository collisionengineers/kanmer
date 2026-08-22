# Research

CORE-052 review at PR #175 head `825fb79dc3528b1d341f532ce8016aa0006624c8` found that `refreshBoardBranch` marks an unexpected live worktree as `branchMismatch`, but `applyGitPreferences` still computes `protectedOpenBoard` from the unchanged cached protected branch and enters the refusal loop, which calls `renameBoardBranch` on the arbitrary live branch. This violates the handoff safety contract. Reuse the existing mismatch flag and protected-branch guard; add an integration regression that checks branch refs and worktree state remain unchanged.
