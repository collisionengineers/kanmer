# Checklist — CORE-058

- [x] Reconcile `.kanmer/data/sources/` in canonical board-worktree ignore creation and existing/mismatch reconciliation without changing branch/ref semantics.
- [x] Add real-Git regressions for new and existing board worktrees, exact rule, and idempotent sync safety.
- [x] Rebuild the committed plugin artifact from a normal checkout of the exact branch and prove byte parity/isolated plugin behavior.
- [x] Run focused GUI Git tests, workspace typecheck/build, scripts/docs/diff, and record linked-worktree guard/external limitations.
- [x] Write post-implementation report and scratch, record parent lineage/commit/PR, refresh gates, and move Implementing→Review.

## Evidence note

Focused GUI Git 15/15 and full GUI 385/385 pass. Workspace typecheck/build, scripts 88/88, protocol 46/46, docs, normal-checkout plugin parity/check, and diff-check pass. The initial stale-core linked build failure is preserved in scratch. Installed-host, packaged-release, and retroactive history-cleanup evidence remain INCONCLUSIVE/deferred.
