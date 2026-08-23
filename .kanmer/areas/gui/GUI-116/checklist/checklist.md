# GUI-116 checklist

- [x] Read full GUI-116, EPIC-009, and HZN-007 context plus PR #168 findings.
- [x] Record research, files, plan, and explicit open-question dispositions.
- [x] Implement durable native reconnect state and reopen reconciliation.
- [x] Add renderer guidance and successful-native-connect clearing.
- [x] Add production-caller regressions for reopen order, failure surfacing, persistence/clear, and project isolation.
- [x] Run focused/full feasible rails and record exact exit codes.
- [x] Write post-implementation report, commit, push, and open PR targeting `core-043-protection-retarget`.
- [x] Obtain independent review (post-implementation gate; not author work). — reconciled against merged-main proof, independent review, and exact cleanup evidence.
- [x] Post-merge proof on merged main (leave unchecked in this lane). — reconciled against merged-main proof, independent review, and exact cleanup evidence.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-116

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/<id>`
- [x] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
