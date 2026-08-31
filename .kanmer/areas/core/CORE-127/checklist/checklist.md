# Checklist — CORE-127

## Implementation steps

- [ ] Step 1 — Harden plan path confinement, supported glob matching and live evidence-pin validation; record failing-first and focused core evidence.
- [ ] Step 2 — Version the exact packet to `step-packet/2`, add checklist/workspace baseline facts and the pure typed classifier; prove tamper, stale and changed-pre-dirty cases.
- [ ] Step 3 — Add the bounded shared Git/evidence snapshot collector and issue constrained packets only from a proven recorded workspace.
- [ ] Step 4 — Extend the existing `reconcile_ticket` and `get_execution_packet` inputs so an exact PASS is required before any later step packet; prove both calls remain read-only.
- [ ] Step 5 — Update canonical operating prose, regenerate the bundle, run the focused and full rails, push one bounded PR and hand off in Review.

## Acceptance census

- [ ] Escaping/absolute/unsupported paths fail closed; literal, `*` and `**` semantics are pinned by tests.
- [ ] Allowed-only changes PASS; forbidden and undeclared paths FAIL with typed evidence, including rename endpoints and a changed pre-dirty path.
- [ ] Wrong/tampered/v1 packet identity refuses.
- [ ] Plan, research, files, group context and checklist state are current; missing/unreadable facts are INCONCLUSIVE.
- [ ] No later packet is issued without PASS for the complete exact prior packet.
- [ ] Board, ticket and activity bytes are unchanged by packet-aware reconciliation.
- [ ] Tool roster remains 41 and no new apply action, workflow stage, board field or dependency appears.
- [ ] Focused tests, `npm run verify`, hosted `verify` and `kanmer-gate` pass at one exact head.
