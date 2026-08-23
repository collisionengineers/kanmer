# Checklist — CORE-058

- [x] Reconcile `.kanmer/data/sources/` in canonical board-worktree ignore creation and existing/mismatch reconciliation without changing branch/ref semantics.
- [x] Add real-Git regressions for new and existing board worktrees, exact rule, and idempotent sync safety.
- [x] Rebuild the committed plugin artifact from a normal checkout of the exact branch and prove byte parity/isolated plugin behavior.
- [x] Run focused GUI Git tests, workspace typecheck/build, scripts/docs/diff, and record linked-worktree guard/external limitations.
- [x] Write post-implementation report and scratch, record parent lineage/commit/PR, refresh gates, and move Implementing→Review.

## Evidence note

Post-base-sync focused GUI Git 15/15, MCP source 17/17, workspace typecheck/build, and diff-check pass. Pre-sync full GUI 385/385, scripts 88/88, protocol 46/46, docs, and normal-checkout plugin parity/check also pass; merged-base normal-checkout plugin parity/check passes with artifact SHA `6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100`. The initial stale-core build failure and PR artifact-only conflict are preserved in scratch/report. Installed-host, packaged-release, and retroactive history-cleanup evidence remain INCONCLUSIVE/deferred.

---

## Closeout — CORE-058

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; exact recorded worktree removal completed
- [x] exact recorded branch deletion completed locally and remotely
- [x] git fetch --prune + git worktree prune completed
- [x] take_ticket action: "release" completed
