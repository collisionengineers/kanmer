# Post-implementation report — CORE-078

## Scope

Implemented the CORE-060 review remediation: a successful manual retry that began while automatic sync was paused now restores the configured timer. Failed retries remain paused and do not create a timer. Healthy manual syncs and timer-driven automatic syncs retain their existing cadence.

## Implementation

- `apps/gui/src/main/index.ts`: records whether a manual invocation started paused; after `syncBoard`, re-arms the canonical timer only when that retry returns to a healthy automatic-sync state. The existing automatic path still performs CORE-077 live-branch inspection and does not reset its interval on each tick.
- `apps/gui/src/main/syncTimer.ts`: centralizes replacement/clear-and-arm behavior for one project's interval, preventing duplicate timers.
- `apps/gui/src/main/syncTimer.test.ts`: fake-timer regressions cover no timer after a failed/disabled retry, timer restoration after success, and replacement without duplicate callbacks.

No governing-doc or manual source change was required: the existing CORE-060 manual already documents Retry semantics and automatic sync pausing/resumption. `check:manual` confirms the generated manual remains current.

## Governing-doc alignment

- FRD-020: automatic sync remains interval-driven, uses the configured project interval, and resumes only after a successful retry restores a healthy board state.
- ADR-0016: timer re-arming is kept inside the GUI lifecycle and does not alter board-branch ownership, Git history, or the protected branch handoff rules.

## Traceability

- Base: CORE-060 PR #197 head `7b0238cfbd10963f20cb7417459505c86e2ff1b` (includes merged CORE-077).
- Commit: `7b355245c7755ccf9a08bfa13394b6834a8a7f61`.
- Branch/worktree: `core-078-rearm-manual-retry` / `.worktrees/core-078`.
- PR: #199, stacked on `core-060-pause-handoff-sync`.
- Independent review requested from `gui082` at the exact commit above.
- PR is intentionally open; no merge performed.

## Verification

- Focused GUI: PASS, 28/28 (24 `kanmerGit`, 2 `syncBranch`, 2 `syncTimer`), final run completed in 57.08s.
- Core: PASS, 283/283.
- Scripts: PASS, 89/89.
- Core build: PASS (`npm run build:core`).
- Manual freshness: PASS, 22 chapters.
- `git diff --check`: PASS.
- GUI typecheck: INCONCLUSIVE/FAIL at inherited CORE-060 dispatch/provider errors only:
  - `src/main/dispatch.ts(8,3)`: missing `dispatchDeliverableProven` export.
  - `src/main/dispatch.ts(55,5)`: unsupported `verifyDeliverable` option.
  - `src/main/dispatch.ts(55,31)`: implicit-any `status`.
  - `src/main/providers.ts(955,27)`: `antigravity` not in `DispatchProviderId`.
  No CORE-078 diagnostic remains.
- Hosted/external proof: not claimed in this local handoff.
