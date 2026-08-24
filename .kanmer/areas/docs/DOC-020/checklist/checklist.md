# Checklist — ADR-0020 lifecycle status

- [x] Set the frontmatter lifecycle status to `draft`.
- [x] Set the displayed ADR status to `draft`.
- [x] Verify no `proposed` status remains in ADR-0020.
- [x] Run documentation validation.
- [x] Record the implementation report.

## Closeout — DOC-020

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/doc-020`
- [x] `git branch -d doc-020-adr-draft-status` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
