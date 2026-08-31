# Checklist — CORE-133

## Implementation steps

- [ ] Step 1 — Rebase onto the exact CORE-127 merge, revalidate overlapping contracts and add failing-first classifier/MCP tests.
- [ ] Step 2 — Admit only real clean/dirty/missing/unrecorded expired-workspace shapes and bind PASS/FAIL routing to current merge SHA.
- [ ] Step 3 — Prove missing/unrecorded recovery end to end through apply while preserving branch/worktree/taken/dirty evidence and unsafe refusals.
- [ ] Step 4 — Pin the already-correct reconcile/apply description, preserve CORE-127 response wiring and regenerate the bundle.
- [ ] Step 5 — Run focused/full verification, push one bounded PR and hand off in Review.

## Acceptance census

- [ ] Missing+unavailable and not-recorded+not-applicable expired claims recover.
- [ ] Clean/dirty+matches behavior remains valid.
- [ ] Live, board, foreign, branch-mismatch, detached, unavailable and synthetic missing+matches do not recover.
- [ ] Recovery deletes nothing and preserves surviving work/claim location evidence.
- [ ] Current-SHA implementation/plan FAIL routes; stale-SHA FAIL refuses with no mutation.
- [ ] PASS, transient and inconclusive behavior remains intact.
- [ ] Tool description names `apply_reconciliation` and the obsolete claim stays absent.
- [ ] CORE-127 packet-aware/packetless reconciliation tests remain green.
- [ ] Tool roster remains 41; bundle matches source.
- [ ] Focused tests, one clean Windows rail, hosted verify, kanmer-gate and exact-head review pass.
