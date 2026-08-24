# Checklist — CI board-branch fetch ref

- [x] Map the configured board branch to a remote-tracking ref in the PR workflow.
- [x] Create the temporary board worktree from that mapped ref.
- [x] Add a focused workflow contract check.
- [x] Run the focused workflow check.
- [x] Run the merge-gate CLI test suite.
- [x] Record implementation and verification results.

## Closeout — CORE-092

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/core-092`
- [x] `git branch -d core-092-board-branch-fetch-ref` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
