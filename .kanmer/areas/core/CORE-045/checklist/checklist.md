# Checklist — CORE-045 lock recovery and public destination classification

- [x] Add PID/timestamp lock metadata and bounded stale-lock options without changing normal lock callers.
- [x] Recover only old locks with demonstrably dead owners; preserve fresh, active, malformed, uncertain, and racing locks fail-closed.
- [x] Add deterministic core lock tests for stale recovery, active protection, callback cleanup, and bounded retries.
- [x] Complete non-global IPv4/IPv6 and IPv4-mapped destination classification without dependencies.
- [x] Add deterministic source lookup tests for special-use/documentation/benchmark/reserved/mapped/public ranges and redirect reuse.
- [ ] Run focused source/core tests, typecheck/build, authoritative HTTP/source rail, and proportionate docs/plugin/diff checks; preserve first failures.
- [ ] Write the post-implementation report mapping F-003/F-009, record commit/PR/base and evidence limits, and update scratch.
- [ ] Re-read get_doc_gates, record traceability, push the stacked PR, move Implementing → Review one boundary, and stop for independent review.
