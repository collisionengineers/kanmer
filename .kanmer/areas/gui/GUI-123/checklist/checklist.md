# Checklist

- [x] Branch/worktree recorded by take_ticket: gui-123-preserve-gui120 / .worktrees/gui-123.
- [x] GUI-120 multi-project broadcast fix and test seams restored by merging 37740379552e241f200bb181a2ca0e9d3be32ece; resulting head 5d041af8.
- [x] GUI-119 provider propagation retained in connect.ts, index.ts, and remoteAccess/manager.ts.
- [x] Focused rail 121/121, GUI typecheck/build, scripts 89/89, docs, and diff checks pass; full workspace typecheck baseline mismatch is recorded as INCONCLUSIVE.
- [ ] Cumulative GUI-122 packet independently reviewed before any merge.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-123

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
