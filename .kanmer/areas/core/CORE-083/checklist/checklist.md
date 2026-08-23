# CORE-083 checklist

- [x] Confirm exact CORE-026 base a9833df28ddf6f91966be17a4eb7c06265e088ed and isolated worktree/branch.
- [x] Read the complete ticket/group packet and governing docs; preserve CORE-082 behavior.
- [x] Record source .kanmer fingerprint in orphan marker and verify it immediately before cleanup.
- [x] Fail closed on mismatch/malformed marker and preserve source + canonical board state.
- [x] Retain canonical boardRoot when source-root ignore reconciliation refuses.
- [x] Add deterministic/real-Git source-version conflict regression.
- [x] Add deterministic/real-Git source-ignore refusal regression.
- [x] Run focused tests, relevant workspace rails, and diff-check; preserve first failures and INCONCLUSIVE boundaries.
- [x] Write post-implementation report with exact commit/PR and exit codes.
- [x] Open ticket-linked PR and hand off at Review; leave post-merge proof unchecked.
- [x] Verify merged-main proof after independent review and merge (Verifying stage only). — reconciled against merged-main proof; inherited external limits remain recorded.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
