# Open questions — CORE-122

- [x] Q1 — Core's `ClaimState` spells the live case `"live"`, the ticket asks for `current | expired | unclaimed`. **Resolved in research:** the evidence schema uses `current | expired | unclaimed` as the ticket and HZN-008 context specify; the collector maps core `claimState()` `"live"` → `"current"`. No change to core's enum.
- [x] Q2 — Merged Review ticket whose PR required checks report `fail`/`pending`: recommend MOVE_TO_VERIFYING or not? **Resolved in research:** the ticket body requires the merged-Review route to be evaluated before the required-checks early return with the warning kept, and a merged PR's checks are historical. Recommend MOVE_TO_VERIFYING with `REQUIRED_CHECKS_NOT_GREEN` retained as a warning; `RECORDED_COMMIT_UNREACHABLE` and `EVIDENCE_INCONCLUSIVE` still block. The salvaged test "does not advance failing checks" is rewritten to a non-Review stage.
- [x] Q3 — Should an `expired` claim produce a recommendation? **Resolved:** no. Report `CLAIM_EXPIRED` as a warning finding; release/transfer stays with CORE-115 (HZN-008 dependency map item 6).

## Parked (explicitly deferred)

- Mutating `apply_reconciliation` on revisions + leases — HZN-008 item 6, after CORE-115.
