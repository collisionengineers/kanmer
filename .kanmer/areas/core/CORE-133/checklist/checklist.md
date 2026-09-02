# Checklist — CORE-133

## Implementation steps

- [x] Step 1 — Rebase onto the exact CORE-127 merge, revalidate overlapping contracts and add failing-first classifier/MCP tests.
- [x] Step 2 — Admit only real clean/dirty/missing/unrecorded expired-workspace shapes and bind PASS/FAIL routing to current merge SHA.
- [x] Step 3 — Prove missing/unrecorded recovery end to end through apply while preserving branch/worktree/taken/dirty evidence and unsafe refusals.
- [x] Step 4 — Pin the already-correct reconcile/apply description, preserve CORE-127 response wiring and regenerate the bundle.
- [ ] Step 5 — Run focused/full verification, push one bounded PR and hand off in Review.

## Acceptance census

- [x] Missing+unavailable and not-recorded+not-applicable expired claims recover.
- [x] Clean/dirty+matches behavior remains valid.
- [x] Live, board, foreign, branch-mismatch, detached, unavailable and synthetic missing+matches do not recover.
- [x] Recovery deletes nothing and preserves surviving work/claim location evidence.
- [x] Current-SHA FAIL routes; stale-SHA FAIL refuses with no mutation.
- [x] PASS, transient and inconclusive behavior remains intact.
- [x] Tool description names `apply_reconciliation` and the obsolete claim stays absent.
- [x] CORE-127 packet-aware/packetless reconciliation tests remain green.
- [x] Tool roster remains 41; bundle matches source.
- [ ] Focused tests, one clean Windows rail, hosted verify, kanmer-gate and exact-head review pass.
