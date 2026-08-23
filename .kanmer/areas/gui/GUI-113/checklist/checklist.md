# GUI-113 checklist

- [x] Confirm complete packet, group context, linked CORE-043 review findings, and governing docs.
- [x] Add provider-owned registration reconciliation with explicit ownership/state checks.
- [x] Wire successful saved board-branch changes to reconcile matching open-project registrations.
- [x] Propagate normalized branch into Grok and Antigravity native descriptors without mutating the source bundle.
- [x] Add adversarial deterministic regressions for both findings and no-unrelated-project mutation.
- [x] Run focused GUI tests and relevant build/type/script/docs/diff rails; preserve exact failures.
- [x] Update report, commit/PR traceability, and request independent review.
- [ ] Post-merge proof (leave unchecked until merged main).

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-113

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
