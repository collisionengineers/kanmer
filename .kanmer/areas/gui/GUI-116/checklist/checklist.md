# GUI-116 checklist

- [x] Read full GUI-116, EPIC-009, and HZN-007 context plus PR #168 findings.
- [x] Record research, files, plan, and explicit open-question dispositions.
- [x] Implement durable native reconnect state and reopen reconciliation.
- [x] Add renderer guidance and successful-native-connect clearing.
- [x] Add production-caller regressions for reopen order, failure surfacing, persistence/clear, and project isolation.
- [x] Run focused/full feasible rails and record exact exit codes.
- [x] Write post-implementation report, commit, push, and open PR targeting `core-043-protection-retarget`.
- [ ] Obtain independent review (post-implementation gate; not author work).
- [ ] Post-merge proof on merged main (leave unchecked in this lane).

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-116

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
