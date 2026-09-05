## Closeout — CORE-140

- [x] PR merge verified (`gh pr view --json state,mergedAt`) — MERGED, mergedAt 2026-09-05T03:39:38Z, mergeCommit 941650317be4cad4f6a86c6ab16362ee5dd8dfdb
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage — already Done
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/CORE-140`
- [ ] `git branch -d CORE-140-rail-build-once` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

### Closeout complete — CORE-140

- [x] cd out of worktree; `git worktree remove .worktrees/CORE-140` — exit 0
- [x] `git branch -d CORE-140-rail-build-once` — exit 0 (merged to origin, fast-forward delete succeeded)
- [x] `git fetch --prune` + `git worktree prune` — exit 0 each; remote branch still existed after prune, deleted explicitly with `git push origin --delete CORE-140-rail-build-once` (exit 0)
- [x] `take_ticket action: "release"` — lease fields cleared, ticket remains Done
