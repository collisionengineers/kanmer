# Checklist — CORE-049

- [x] Read complete CORE-046/047 packets and identify existing retry helper.
- [x] Route stale quarantine rename through bounded retry.
- [x] Add EPERM/EBUSY/EACCES deterministic regression coverage.
- [x] Preserve ownership/concurrency/source tests.
- [x] Regenerate plugin artifact and run parity checks if source changes.
- [x] Refresh cumulative CORE-046 report and exact traceability.
- [x] Disposition fixed PR thread with evidence.
- [x] Request independent cumulative review.

---

## Closeout — CORE-049

- [x] PR merge verified (PR #171 merged 2026-08-22T12:10:43Z; child PR #172 merged 2026-08-22T12:07:18Z)
- [x] proof.md finalised (PR URLs, merge dates, and cumulative verification basis recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body
- [x] cd out of worktree; `git worktree remove .worktrees/core-049`
- [x] `git branch -d core-049-quarantine-rename-retry`
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
