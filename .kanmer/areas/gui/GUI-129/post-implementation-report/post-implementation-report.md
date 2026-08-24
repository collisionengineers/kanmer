# Post-implementation report — GUI-129

## Summary

The settings persistence path now retries only short-lived Windows `EPERM`/`EBUSY` failures during the final atomic rename, using a fixed 10/20/40 ms backoff. The temporary file is still fully written before replacement, and a non-eligible or exhausted error is rethrown unchanged. The settings test no longer shares a fixed Windows directory and adds deterministic coverage for recovery, retry bounds, non-retry behavior, persistent error surfacing, and successful temporary-file cleanup.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/settings.ts` | Added `renameSettingsFile` and wired the existing `writeSettings` temporary-write path through it. | Handles a brief external Windows rename lock without changing the atomic replacement sequence or hiding a final error. |
| `apps/gui/src/main/settings.test.ts` | Made the mocked Electron user-data path unique per test and added deterministic rename/error/cleanup assertions. | Eliminates a reusable fixture collision and proves the bounded production behavior without fabricating a real antivirus lock. |

## Governing docs

- `docs/functional/frd/FRD-019-gui-shell.md` — Meets R7: desktop-shell settings remain persisted through the same production `writeSettings` caller and all existing settings mutators continue to use `withSettingsFileLock`. No FRD, schema, UI, or settings format change is made.

## Risks / follow-ups

- The final replacement is intentionally synchronous because the existing production writer is synchronous. The retry budget is small (70 ms total pause) and activates only after a qualifying Windows rename failure.
- A normal-checkout full `npm run verify` attempt at this head exposed an unrelated 10-second `index.sync.test.ts` hook timeout and then failed to terminate. It is preserved as a failure/inconclusive attempt in `scratch/execute`; the named isolated suite passed 11/11 on rerun. The independent reviewer and hosted CI must assess that full-rail boundary.
- `MCP-048`, remote-access persistence, OpenAI tunnel persistence, settings schema, and dependencies are out of scope.

## Verification hand-off

On the PR head `49807c28a6a3e371bc2793a1ef8c10db63363d92`:

- Isolated ticket worktree with absolute npm prefix: core build exit 0; focused `settings.test.ts` 11/11, three exit-0 runs; GUI typecheck exit 0; GUI production build exit 0.
- Clean normal clone baseline at parent `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`: focused settings 5/5, exit 0.
- Full normal-clone `npm run verify` is not a pass: Core 310/310 passed, then an unrelated index-sync hook timed out; the runner required interruption (exit 1). The exact named index-sync rerun is PASS 11/11, exit 0.
- After merge, run the focused settings test and an applicable authoritative verification rail on merged `main`, recording all exit codes in `proof.md`.
