# Checklist — PR body edit merge-gate rerun

- [x] Base the branch on CORE-092’s fetch-ref remediation.
- [x] Add `edited` to the pull-request trigger.
- [x] Add focused workflow contract coverage for the body-edit trigger.
- [x] Document the merge-gate convention in `AGENTS.md`.
- [x] Run focused workflow and gate CLI tests.
- [x] Run the script test rail and review the diff.
- [x] Record implementation results and open the PR.

## Closeout — CORE-093

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/core-093`
- [x] `git branch -d core-093-pr-body-edit-trigger` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
