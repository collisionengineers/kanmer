# Checklist — CORE-127

## Implementation steps

- [x] Step 1 — Harden plan path confinement, supported glob matching and live evidence-pin validation; record failing-first and focused core evidence.
- [x] Step 2 — Version the exact packet to `step-packet/2`, add checklist/workspace baseline facts and the pure typed classifier; prove tamper, stale and changed-pre-dirty cases.
- [x] Step 3 — Add the bounded shared Git/evidence snapshot collector and issue constrained packets only from a proven recorded workspace.
- [x] Step 4 — Extend the existing `reconcile_ticket` and `get_execution_packet` inputs so an exact PASS is required before any later step packet; prove both calls remain read-only.
- [x] Step 5 — Update canonical operating prose, regenerate the bundle, run the focused and full rails, push one bounded PR and hand off in Review.

## Acceptance census

- [x] Escaping/absolute/unsupported paths fail closed; literal, `*` and `**` semantics are pinned by tests.
- [x] Allowed-only changes PASS; forbidden and undeclared paths FAIL with typed evidence, including rename endpoints and a changed pre-dirty path.
- [x] Wrong/tampered/v1 packet identity refuses.
- [x] Plan, research, files, group context and checklist state are current; missing/unreadable facts are INCONCLUSIVE.
- [x] No later packet is issued without PASS for the complete exact prior packet.
- [x] Board, ticket and activity bytes are unchanged by packet-aware reconciliation.
- [x] Tool roster remains 41 and no new apply action, workflow stage, board field or dependency appears.
- [ ] Focused tests, `npm run verify`, hosted `verify` and `kanmer-gate` pass at one exact head. Local focused and authoritative Windows verification pass at `fbeab7630d6d287c90f1d59da596890ae507b0be`; hosted checks are pending on PR #307.
