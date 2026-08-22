# Checklist — CORE-058

- [ ] Reconcile `.kanmer/data/sources/` in canonical board-worktree ignore creation and existing/mismatch reconciliation without changing branch/ref semantics.
- [ ] Add real-Git regressions for new and existing board worktrees, exact rule, and idempotent sync safety.
- [ ] Rebuild the committed plugin artifact from a normal checkout of the exact branch and prove byte parity/isolated plugin behavior.
- [ ] Run focused GUI Git tests, workspace typecheck/build, scripts/docs/diff, and record linked-worktree guard/external limitations.
- [ ] Write post-implementation report and scratch, record parent lineage/commit/PR, refresh gates, and move Implementing→Review.
