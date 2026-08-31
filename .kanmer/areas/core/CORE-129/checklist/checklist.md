# Checklist — CORE-129

## Implementation steps

- [ ] Step 1 — Add the versioned central proof parser and prove authoritative-attempt/top-level consistency, malformed cases and a valid single-attempt PASS.
- [ ] Step 2 — Add board-owned report/strict proof policy and wire the shared parsed state into the existing gate engine.
- [ ] Step 3 — Extend `migrate_board` with a byte-preserving historical census and deliberate strict-policy cutover.
- [ ] Step 4 — Replace reconciliation's independent decoder with the shared parser while preserving exact-SHA and failure-class routing.
- [ ] Step 5 — Update canonical proof prose, regenerate manual/bundle, run focused/full rails and open one bounded PR.

## Acceptance census

- [ ] PASS followed by an authoritative FAIL or INCONCLUSIVE cannot reach Done.
- [ ] Top-level result must equal the latest authoritative attempt.
- [ ] Valid current single-attempt PASS remains valid and exact-merge-SHA-bound.
- [ ] Legacy/invalid proof IDs and diagnostics are reported before strict is enabled.
- [ ] Dry-run census changes no bytes; real cutover changes only board proof policy.
- [ ] Existing Done history is not reopened or rewritten.
- [ ] Strict `get_doc_gates`, move-to-Done and `reconcile_ticket` agree on proof state.
- [ ] Existing FAIL failure-class routes and visual-proof advisory remain intact.
- [ ] No new tool/stage/dependency appears; plugin roster remains 41.
- [ ] Focused tests, one clean Windows `npm run verify`, hosted `verify`, `kanmer-gate` and exact-head review pass at one final head.
