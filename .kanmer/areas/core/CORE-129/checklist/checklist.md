# Checklist — CORE-129

## Implementation steps

- [ ] Step 1 — Add the strict versioned central proof parser; require a final authoritative entry and bind environment, verified time, result, failure class, process/manual evidence, ordering and a valid single-attempt PASS.
- [ ] Step 2 — Add board-owned report/strict proof policy, wire the shared parsed state into the existing gate engine, and update every affected fresh-board strict fixture.
- [ ] Step 3 — On current-format boards only, extend `migrate_board` with a complete byte-preserving census/digest and lock-atomic digest-bound strict-policy cutover.
- [ ] Step 4 — Replace reconciliation's independent decoder with the shared parser while preserving exact-SHA and failure-class routing.
- [ ] Step 5 — Update FRD-002/FRD-006 and canonical verify/closeout/auto/setup/manual prose, regenerate manual/bundle, run focused/full rails and open one bounded PR.

## Acceptance census

- [ ] The final ledger entry is authoritative; any later FAIL or INCONCLUSIVE invalidates an earlier PASS and cannot reach Done.
- [ ] Top-level result, verified timestamp and failure class agree with the final authoritative attempt.
- [ ] Blank environment, unknown keys, ambiguous manual/process evidence, exit/result contradictions, timestamp ties/reversals and incompatible failure classes are invalid.
- [ ] A noncanonical proof Markdown cannot satisfy canonical `proof/proof.md` authority.
- [ ] Valid current single-attempt PASS remains valid and exact-merge-SHA-bound.
- [ ] Legacy/invalid proof IDs and diagnostics are reported before strict is enabled.
- [ ] Old-format/incomplete census, missing/stale digest and concurrent drift refuse without writes; successful current-format cutover changes only board proof policy under the same lock.
- [ ] Existing Done history is not reopened or rewritten.
- [ ] Strict `get_doc_gates`, move-to-Done and `reconcile_ticket` agree on proof state.
- [ ] Existing FAIL failure-class routes and visual-proof advisory remain intact.
- [ ] FRD-002, FRD-006, setup and proof/gates/first-ticket manuals match report/strict behavior; no new tool/stage/dependency appears and the plugin roster remains 41.
- [ ] Focused tests, one clean Windows `npm run verify`, hosted `verify`, `kanmer-gate` and exact-head review pass at one final head.
