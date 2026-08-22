# GUI-113 plan

## Governing documents

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`
- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`

## Execution

1. Inspect the current provider registration and native descriptor contracts at the CORE-043 cumulative base.
2. Add a provider-owned, state-gated registration reconciliation helper that rewrites only this project's existing registration with a branch-aware invocation and preserves all unknown data.
3. Wire reconciliation into the successful branch-preference save path. Do not reconcile contexts that were refused, detached, unavailable, mismatched, or in another project; surface any provider failure in that context's existing error/pause status.
4. Propagate the normalized branch through native Grok/Antigravity connect. Install from a disposable staged descriptor bundle with the branch environment set; never mutate the bundled source or an unrelated project.
5. Add deterministic adversarial regressions for both findings, provider ownership, idempotence, no-registration/no-mutation, hostile branch values, native descriptors, and refusal/failure visibility.
6. Run focused GUI tests and the required local build/type/script/docs/diff rails. Record exact exit codes, including any inherited baseline failure, in the report.

## Stop condition

Commit and push the bounded implementation, open a PR targeting the current CORE-043 cumulative branch, update traceability and the checklist, move Implementing→Review after a fresh gate read, and stop. Do not merge, verify, close, or self-review.
