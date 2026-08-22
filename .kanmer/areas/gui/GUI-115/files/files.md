# Files and production surface

This remediation changes the GUI board-worktree handoff lifecycle in the existing production sync path.

- `apps/gui/src/main/kanmerGit.ts` — retain a durable handoff-required state and expose the lifecycle operations needed by the main-process coordinator. The state must remain visible after a failed hosted-variable confirmation and must only clear after the configured board branch is confirmed.
- `apps/gui/src/main/index.ts` — coordinate automatic sync, Retry, and rename/push/delete as one serialized lifecycle. Repaired unavailable projects must re-arm their timer; rename operations must exclude overlapping sync/retry calls and restore the timer after completion.
- `apps/gui/src/main/kanmerGit.test.ts` — deterministic regressions for persistent handoff state and recovery/retry timer behavior.
- `apps/gui/src/main/index.sync.test.ts` — deterministic regressions proving rename and sync cannot overlap and that timers are restored on both success and failure.

Production callers are the existing project-open/retry handlers and the existing periodic sync timer in `apps/gui/src/main/index.ts`; no parallel registration or synchronization subsystem is introduced.

The behavior is governed by FRD-020 (board worktree sync) and ADR-0016 (compiled workflow). The implementation must preserve the existing provider registration/branch handoff contract established by GUI-112 through GUI-114.
