# GUI-118 checklist

- [x] Confirm exact CORE-043 parent head and isolated worktree/branch (base 1126253eed586111db60ed72eccf6754f0f5ef06; gui-118-provider-lifecycle; .worktrees/gui-118).
- [x] Read full ticket/group packet and governing docs (GUI-118, HZN-007, CORE-043 findings, FRD-020, FRD-012, ADR-0016).
- [x] Fix transactional rename persistence and provider/lifecycle serialization.
- [x] Preserve Retry/provider failures and durable handoff warnings.
- [x] Mark native reconnect state correctly and verify branch binding.
- [x] Add production-caller regressions for every finding.
- [x] Run focused/full GUI, typecheck/build/docs/scripts/diff rails; preserve first failures.
- [x] Update CORE-043 packet and post-implementation report.
- [x] Open linked PR #219 and hand off at Review; proof remains unwritten until merged-main verification.

- [x] GUI-122 rebase integrated CORE-043 current provider propagation and refreshed this cumulative packet; GUI-122 review remains a separate gated handoff.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-118

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
