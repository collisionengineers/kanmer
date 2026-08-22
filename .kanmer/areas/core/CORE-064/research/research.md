# Research

## Finding

PR #180 review at `b1abac871da28522759d4e5582caa69d5cdb5cd5` identified a second board-root loss path. In `apps/gui/src/main/kanmerGit.ts`, the existing `.worktrees/kanmer` path is renamed onto the configured branch before `ensureBoardWorktreeIgnore` runs. If ignore reconciliation then throws, the outer catch returns `empty(branch, error)`, discarding the now-canonical board root.

## Expected behavior

Every failure after the canonical board worktree path is known must retain that path, report an actionable paused state, and never allow callers to fall back to the source checkout.

## Constraints

Keep the change in the GUI Git seam, use a deterministic real-Git regression, preserve retry-safe status semantics, and add no dependency.
