# Checklist

- [x] Trace existing branch-refresh implementation and reuse its state model.
- [x] Require refreshed branch equality with the requested destination.
- [x] Preserve paused/error state during refresh.
- [x] Document the `KANMER_BOARD_BRANCH` Actions-variable handoff.
- [x] Reconcile contradictory `troubleshooting.md` rename guidance and regenerate the manual.
- [x] Add deterministic tests for all four findings.
- [x] Run focused tests, typecheck/build, plugin parity, and verification; record exit codes.
- [x] Update post-implementation report and cumulative CORE-043 lineage before review.

## Evidence

- Focused Git rail: 19/19 PASS.
- Manual/docs/core/scripts rails: PASS after the explicit core build prerequisite; scripts rerun 89/89 PASS.
- Full GUI/typecheck/build failures are preserved as unrelated shared-dispatch baseline failures in the post-implementation report.
- plugin:check is setup-limited in this linked worktree and is recorded as INCONCLUSIVE.
- CORE-043 cumulative base is recorded in the report; parent ticket/source remains untouched because this child is the remediation handoff.

---

## Closeout — CORE-052

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; exact recorded worktree removal pending
- [ ] exact recorded branch deletion pending
- [ ] git fetch --prune + git worktree prune pending
- [ ] take_ticket action: "release" pending
