# Checklist — CORE-056 source refresh remediation

- [ ] Serialize per-source cache read, freshness decision, fetch/revalidation, and write under one existing core lock without recursive locking.
- [ ] Charge retained linked-document bytes during root-304 revalidation and omit/report over-budget retained pages.
- [ ] Rediscover bounded links from the cached root and retry links absent from cached.documents; preserve fitting stale pages and surface failures.
- [ ] Add deterministic concurrent-refresh, 304-byte-budget, and missing-link-retry regressions without weakening inherited assertions.
- [ ] Run focused core/source tests, typechecks, scripts/docs, and feasible verification/build rails; record first failures and exact exits.
- [ ] Regenerate the standalone plugin artifact needed by the source change and record any inherited provenance limitation as INCONCLUSIVE.
- [ ] Write the post-implementation report and scratch handoff with governing-doc mapping, scope, evidence, and external boundaries.
- [ ] Commit/push, record exact SHA/PR traceability, confirm get_doc_gates, and move CORE-056 to Review only.
