# Checklist — CORE-057

- [x] Trace current public-destination DNS preflight and actual fetch transport at the exact CORE-044 head.
- [x] Bind the outbound request to the address validated by preflight, or implement and document a governing-doc-backed safe equivalent.
- [x] Enforce one bounded deadline across DNS resolution, redirects, and response body reads.
- [x] Add deterministic rebinding/address-binding and resolver-timeout regressions while retaining existing source-boundary coverage.
- [x] Run focused and relevant source/core/HTTP/typecheck/build/smoke/docs/plugin/diff rails; record exact exits and failures.
- [x] Write report/scratch, record CORE-044 lineage and PR, refresh gates, and hand off at Review with external evidence explicit.

## Evidence note

Deterministic source/core/HTTP, build, MCP typecheck, scripts, protocol smoke, docs/manual, and diff rails passed as recorded in `post-implementation-report.md` and `scratch/execute.md`. Root all-workspace typecheck and linked-worktree plugin-check failures are preserved; live DNS rebinding/private-network, Windows-host, packaged-app, and external network evidence remain INCONCLUSIVE.
