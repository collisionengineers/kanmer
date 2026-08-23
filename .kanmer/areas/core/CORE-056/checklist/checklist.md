# Checklist — CORE-056 source refresh remediation

- [x] Serialize per-source cache read, freshness decision, fetch/revalidation, and write under one existing core lock without recursive locking.
- [x] Charge retained linked-document bytes during root-304 revalidation and omit/report over-budget retained pages.
- [x] Rediscover bounded links from the cached root and retry links absent from cached.documents; preserve fitting stale pages and surface failures.
- [x] Add deterministic concurrent-refresh, 304-byte-budget, and missing-link-retry regressions without weakening inherited assertions.
- [x] Run focused core/source tests, typechecks, scripts/docs, and feasible verification/build rails; record first failures and exact exits.
- [x] Regenerate the standalone plugin artifact needed by the source change and record any inherited provenance limitation as INCONCLUSIVE.
- [x] Write the post-implementation report and scratch handoff with governing-doc mapping, scope, evidence, and external boundaries.
- [x] Commit/push, record exact SHA/PR traceability, confirm get_doc_gates, and move CORE-056 to Review only.

---

## Closeout — CORE-056

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; exact recorded worktree removal pending
- [ ] exact recorded branch deletion pending
- [ ] git fetch --prune + git worktree prune pending
- [ ] take_ticket action: "release" pending
