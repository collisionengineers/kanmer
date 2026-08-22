# Checklist — CORE-047

- [x] Read CORE-046 packet, independent attestation, HZN-007 context, FRD-027, and ADR-0020.
- [x] Reproduce the reversed-order replacement-lock race deterministically.
- [x] Implement ownership-safe atomic quarantine/reclaim semantics.
- [x] Preserve inherited IO atomic-write/rename/TMP_FILE_RE assertions.
- [x] Add and pass the reversed-order concurrent regression.
- [x] Run focused IO/core rails and relevant typecheck/build checks.
- [x] Update report with exact SHA, tests, and external INCONCLUSIVE boundaries.
- [x] Move Implementing→Review only after gates pass; stop for independent review.

---

## Closeout — CORE-047

- [x] PR merge verified (PR #169 merged 2026-08-22T11:25:28Z)
- [x] proof.md finalised (PR URL, merge date, and cumulative verification basis recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body
- [x] cd out of worktree; `git worktree remove .worktrees/core-047`
- [x] `git branch -d core-047-replacement-lock-race`
- [x] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
