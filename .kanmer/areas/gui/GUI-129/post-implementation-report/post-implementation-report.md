# Post-implementation report — GUI-129

## Summary

The settings persistence path now retries only short-lived Windows `EPERM` / `EBUSY` failures during the final atomic rename, using a fixed 10/20/40 ms backoff. The temporary file is still fully written before replacement, and a non-eligible or exhausted error is rethrown unchanged. The settings test uses a process-unique temporary user-data path and adds deterministic coverage for recovery, retry bounds, non-retry behavior, persistent error surfacing, and successful temporary-file cleanup.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/settings.ts` | Added `renameSettingsFile` and wired the existing `writeSettings` temporary-write path through it. | Handles a brief external Windows rename lock without changing the atomic replacement sequence or hiding a final error. |
| `apps/gui/src/main/settings.test.ts` | Made the mocked Electron user-data path unique per test and added deterministic rename/error/cleanup assertions. | Eliminates a reusable fixture collision and proves the bounded production behavior without fabricating a real antivirus lock. |

## Governing document

- `docs/functional/frd/FRD-019-gui-shell.md` — Meets R7: desktop-shell settings remain persisted through the same production `writeSettings` caller and all existing settings mutators continue to use `withSettingsFileLock`. No FRD, schema, UI, or settings-format change is made.

## Scope and risks

- Scope is limited to the final Windows settings-file rename and its test evidence. The retry budget is 70 ms total, only after a qualifying rename failure.
- Atomicity remains temp-write then rename; errors still surface when retries exhaust or the error is not eligible.
- `MCP-048`, remote-access persistence, OpenAI tunnel persistence, settings schema, dependencies, test scheduling, timeouts, and assertions are out of scope.

## Verification

Rebased commit: `cfac84a8cc45876f8d3d517d3d6573d0c6fb8ff0`.

| Check | Result |
|---|---|
| Isolated ticket worktree: `npm --prefix <absolute-worktree> ci --ignore-scripts` | exit 0 |
| Isolated ticket worktree: `npm --prefix <absolute-worktree> run build -w @kanmer/core` | exit 0 |
| Isolated ticket worktree: `npm --prefix <absolute-worktree> test -w @kanmer/gui -- --run src/main/settings.test.ts` | 11/11, exit 0, repeated three times |
| Isolated ticket worktree GUI typecheck and production build | both exit 0 |
| Fresh genuine GitHub-origin normal clone at the exact rebased head: `npm --prefix <absolute-clone> ci --ignore-scripts` | exit 0 |
| Same normal clone: `npm --prefix <absolute-clone> run verify` | exit 0 — Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 98/98; all remaining verify rails passed |

No other local GUI full-test rail was active before the authoritative normal-clone verification began, and no Node process from that clone remained afterward.

## Preserved prior evidence

- Earlier bare-`npm` worktree commands were setup-contaminated because npm could resolve the parent checkout; they are not used as verification evidence.
- Before the rebase, a full normal-clone verification at predecessor `49807c28a6a3e371bc2793a1ef8c10db63363d92` passed Core 310/310 and GUI settings 11/11 but failed when an unrelated `index.sync.test.ts` cleanup hook timed out at 10 seconds and the runner would not exit (recorded as exit 1/inconclusive in `scratch/execute`). A later isolated named index-sync suite passed 11/11. This historical failure is retained rather than overwritten; the decisive verification above is the fresh canonical-origin run at the rebased PR head.

## Review hand-off

PR: https://github.com/collisionengineers/kanmer/pull/241

An independent reviewer should inspect the two scoped GUI files, confirm the Windows-only retry eligibility and preserved atomic/error behavior, and use the recorded canonical-origin verification. Do not merge or write proof until review has approved and the PR is merged; `kanmer-verify` owns merged-main proof.
