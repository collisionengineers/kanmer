# Post-implementation report — CORE-060

## Scope delivered

Implemented the bounded pause/hand-off remediation on:

- `apps/gui/src/main/kanmerGit.ts`
  - records whether branch-mismatch detection generated the current error and pause
  - clears only those generated fields after the exact requested branch is observed
  - preserves genuine pre-existing sync errors/pauses
  - resets mismatch provenance when a new sync failure is surfaced
  - exports the shared automatic-sync safety predicates
- `apps/gui/src/main/index.ts`
  - centralizes timer clearing/arming
  - arms timers only for available, unpaused, non-mismatched boards
  - marks timer-triggered calls as automatic and re-checks the state immediately before execution
  - disarms stale timers after a pause/mismatch or failed sync
  - keeps manual `Sync now`/`Retry` on the existing unguarded path
  - applies the same safe timer lifecycle around project open, preference changes, close, and migration
- `apps/gui/src/main/kanmerGit.test.ts`
  - exact-destination cleanup regression for generated mismatch state
  - genuine error/pause preservation regression across a mismatch handoff
  - deterministic automatic-sync scheduling/execution policy matrix
- `docs/manual/board-sync.md`
- `docs/manual/troubleshooting.md`
  - explain that automatic sync remains stopped during an incomplete branch handoff and that only generated state is cleared after exact destination validation
- `apps/gui/src/renderer/src/manual/chapters.generated.ts`
  - regenerated shipped manual artifact

## Governing-doc alignment

FRD-020 R3 requires automatic sync to pause visibly on unsafe/conflicted state, preserve the Git error, and keep Sync now/Retry available. The timer guard now treats branch mismatch as the same safety boundary and never pushes using a stale cached branch automatically. FRD-020 R5 and ADR-0016 keep protected-branch handoff operator-owned; this change observes and guards local state only and does not mutate refs or call GitHub.

## Deterministic evidence

- Implementation commit: `fbb528734e43d2d86c24359b88395169f197506b`
- Base: CORE-043 PR #168 head `94f7094b0b103aecec452f0e58ebaf0ad370f8ff`
- PR: #197, base `core-043-protection-retarget`
- Focused GUI Git rail: PASS, 23/23
- Core suite: PASS, 283/283
- Scripts suite: PASS, 89/89
- `npm run build:core`: PASS
- `npm run build:manual`: PASS
- `npm run check:manual`: PASS
- `git diff --check origin/core-043-protection-retarget --`: PASS
- GUI typecheck: INCONCLUSIVE on inherited base errors outside this ticket:
  - `packages/core` does not export `dispatchDeliverableProven`
  - `DispatchSupervisorOptions` has no `verifyDeliverable` property
  - callback parameter `status` has implicit `any`
  - `"antigravity"` is not assignable to `DispatchProviderId`

No hosted branch-protection or external administrator handoff was fabricated. Review should validate the exact stacked diff and preserve the recorded typecheck boundary.

## Review handoff

PR #197 is open against CORE-043 for independent review. No merge was performed.
