# Checklist — CORE-057

- [ ] Trace current public-destination DNS preflight and actual fetch transport at the exact CORE-044 head.
- [ ] Bind the outbound request to the address validated by preflight, or implement and document a governing-doc-backed safe equivalent.
- [ ] Enforce one bounded deadline across DNS resolution, redirects, and response body reads.
- [ ] Add deterministic rebinding/address-binding and resolver-timeout regressions while retaining existing source-boundary coverage.
- [ ] Run focused and relevant source/core/HTTP/typecheck/build/smoke/docs/plugin/diff rails; record exact exits and failures.
- [ ] Write report/scratch, record CORE-044 lineage and PR, refresh gates, and hand off at Review with external evidence explicit.
