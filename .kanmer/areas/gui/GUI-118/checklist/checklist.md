# GUI-118 checklist

- [x] Confirm exact CORE-043 parent head and isolated worktree/branch (base 1126253eed586111db60ed72eccf6754f0f5ef06; `gui-118-provider-lifecycle`; `.worktrees/gui-118`).
- [x] Read full ticket/group packet and governing docs (GUI-118, HZN-007, CORE-043 findings, FRD-020, FRD-012, ADR-0016).
- [x] Fix transactional rename persistence and provider/lifecycle serialization.
- [x] Preserve Retry/provider failures and durable handoff warnings.
- [x] Mark native reconnect state correctly and verify branch binding.
- [x] Add production-caller regressions for every finding.
- [x] Run focused/full GUI, typecheck/build/docs/scripts/diff rails; preserve first failures.
- [x] Update CORE-043 packet and post-implementation report.
- [ ] Open linked PR and hand off at Review; leave proof unchecked.
