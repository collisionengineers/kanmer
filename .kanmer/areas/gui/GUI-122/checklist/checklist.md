# Checklist

- [x] Branch/worktree recorded by take_ticket: gui-122-rebase-provider-propagation / .worktrees/gui-122.
- [x] Current CORE-043 head 7654a281 integrated without dropping GUI-119 behavior; clean merge commit 94d9fca2.
- [x] Focused rails and required build/type/diff checks pass; full workspace typecheck baseline mismatch is recorded as INCONCLUSIVE.
- [x] Cumulative GUI-118 packet refreshed with exact merge SHA 94d9fca2 and PR #222 reference.
- [x] GUI-123 cumulative remediation restores GUI-120 projectId:id broadcast and 121/121 focused evidence at 5d041af8; PR pending.
- [ ] Independent review completed before any merge.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-122

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/<id>`
- [x] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
