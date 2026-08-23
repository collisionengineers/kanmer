# Checklist

- [x] Correct the loop payload to use each project id. The GUI-118 base already contained projectId: id; GUI-120 preserves that behavior and adds an explicit regression/comment so the review finding cannot regress.
- [x] Add and pass the two-project production-caller regression.
- [x] Run focused tests, typecheck, build, scripts, and diff checks; preserve the workspace typecheck baseline failure.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-120

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
