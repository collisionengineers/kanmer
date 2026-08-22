# Checklist — CORE-045 lock recovery and public destination classification

- [x] Add PID/timestamp lock metadata and bounded stale-lock options without changing normal lock callers.
- [x] Recover only old locks with demonstrably dead owners; preserve fresh, active, malformed, uncertain, and racing locks fail-closed.
- [x] Add deterministic core lock tests for stale recovery, active protection, callback cleanup, and bounded retries.
- [x] Complete non-global IPv4/IPv6 and IPv4-mapped destination classification without dependencies.
- [x] Add deterministic source lookup tests for special-use/documentation/benchmark/reserved/mapped/public ranges and redirect reuse.
- [x] Run focused source/core tests, typecheck/build, authoritative HTTP/source rail, and proportionate docs/plugin/diff checks; preserve first failures. Core 106/106, source 13/13, HTTP 81/81, scripts 88/88, protocol 46/46, discovery 13/13, typecheck/build/plugin/docs rails pass.
- [x] Write the post-implementation report mapping F-003/F-009, record commit/PR/base and evidence limits, and update scratch.
- [x] Re-read get_doc_gates, record traceability, push stacked PR #166, move Implementing → Review one boundary, and stop for independent review.

---

## Closeout — CORE-045

- [x] PR merge verified (PR #166 merged 2026-08-22T12:55:09Z)
- [x] proof.md finalised (PR URL, merge date, and cumulative verification basis recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body
- [x] cd out of worktree; `git worktree remove .worktrees/core-045`
- [x] `git branch -d core-045-lock-dns-remediation`
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
