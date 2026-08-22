# Post-implementation report — CORE-076

## Scope delivered

Implemented the bounded CORE-072 review remediation in:

- `apps/gui/src/main/kanmerGit.ts`
- `apps/gui/src/main/kanmerGit.test.ts`

The orphan finalizer now records a pending migration marker when copied source board data is attached to a new orphan worktree. Once the board has been committed and pushed, the source `.kanmer/` cleanup is retried whenever that marker remains, rather than returning early solely because `HEAD` exists. Cleanup errors remain surfaced through the paused status and preserve the canonical board root. The implementation also retains the pre-marker legacy path for attached unborn orphan worktrees, so existing migrations without the marker still commit/push and clean up correctly. A successful cleanup removes the marker; repeated calls remain no-ops.

## Deterministic evidence

- Commit: `ceaab8d455fd198a3421fa73bbf361ec33df0bd0`
- PR: #196, stacked on CORE-072 PR #194, base `core-072-resume-orphan-migration`
- Focused GUI Git test: PASS, 27/27
  - Includes the existing attached-unborn orphan migration assertion.
  - Includes the new post-commit cleanup failure/retry/idempotence regression.
- `npm run build:core`: PASS
- `npm run test:scripts`: PASS, 88/88
- `git diff --check 9abfc9f47b8acfa31ef57d5b30071f72de43497c --`: PASS
- GUI typecheck: INCONCLUSIVE on inherited base errors outside this two-file scope. Exact failures:
  - `packages/core` does not export `dispatchDeliverableProven`
  - `DispatchSupervisorOptions` has no `verifyDeliverable` property
  - the `status` callback parameter is implicit `any`
  - `"antigravity"` is not assignable to `DispatchProviderId`

The first focused attempt was intentionally preserved in scratch: 26/27, because the existing no-HEAD fixture predates the new marker. The compatibility condition was corrected to recover either a pending-marker migration or an attached unborn orphan, and the corrected rail is 27/27. No assertion was weakened.

Hosted Windows/remote file-lock behavior was not fabricated; it remains an independent Review/Verify concern.

## Review handoff

PR #196 is open for independent review against CORE-072. The implementation is limited to the orphan finalization retry and its deterministic regression. No merge was performed.
