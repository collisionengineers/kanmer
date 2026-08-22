# Checklist — CORE-057

- [x] Trace current public-destination DNS preflight and actual fetch transport at the exact CORE-044 head.
- [x] Bind the outbound request to the address validated by preflight, or implement and document a governing-doc-backed safe equivalent.
- [x] Enforce one bounded deadline across DNS resolution, redirects, and response body reads.
- [x] Add deterministic rebinding/address-binding and resolver-timeout regressions while retaining existing source-boundary coverage.
- [x] Run focused and relevant source/core/HTTP/typecheck/build/smoke/docs/plugin/diff rails; record exact exits and failures.
- [x] Write report/scratch, record CORE-044 lineage and PR, refresh gates, and hand off at Review with external evidence explicit.

## Evidence note

Deterministic source/core/HTTP, build, MCP typecheck, scripts, protocol smoke, docs/manual, and diff rails passed as recorded in `post-implementation-report.md` and `scratch/execute.md`. Root all-workspace typecheck and linked-worktree plugin-check failures are preserved; live DNS rebinding/private-network, Windows-host, packaged-app, and external network evidence remain INCONCLUSIVE.


## Post-sync evidence — 2026-08-22

- [x] Reconciled CORE-056 merge conflict while preserving DNS-bound transport/deadline and locked cache refresh behavior; final branch head 5f63571ecc7d71c102fc134b72d065207b11eae9 and PR #178 is open/mergeable.
- [x] Re-ran post-sync source 19/19, MCP HTTP 87/87, core/server builds, workspace typecheck, scripts 88/88, protocol smoke 46/46, docs, and diff-check; exact exits are in the report.
- [x] Regenerated and parity-checked standalone plugin from an exact normal checkout; SHA256 06110A9E0CA2007A51CC2AEDCDD0E2BD353B627484C184AADB709A52AF686878.

External/live DNS, Windows/package, hosted CI, and external network proof remains INCONCLUSIVE; independent review is required for the changed head.
