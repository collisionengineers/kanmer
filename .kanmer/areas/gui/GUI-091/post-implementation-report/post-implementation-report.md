# Post-implementation report — GUI-091

## Delivered

- Added `KANMER_SMOKE_CAPTURE_PATH`, an opt-in capability that runs only within the existing `KANMER_SMOKE` lifecycle.
- After the real renderer has loaded and reached `ready-to-show`, the main process injects a visible, unique `KANMER-SMOKE-…` DOM marker, reads it back, calls Electron's `webContents.capturePage()`, and writes a new PNG using exclusive creation.
- Added a failure-closed helper: blank/non-PNG paths, stale marker readback, empty `NativeImage`, empty PNG data, and existing output paths all fail rather than claim proof.
- Documented the invocation in `AGENTS.md`, including the required fresh profile and the renderer-only boundary.

## Verification

- PASS: `npm test -w @kanmer/gui -- smokeCapture.test.ts` — 5 focused tests.
- PASS: `npm test -w @kanmer/gui` — full GUI Vitest suite, including the new smoke-capture tests.
- PASS: `npm run typecheck -w @kanmer/gui`.
- PASS: `npm run build -w @kanmer/gui`.
- PASS: `git diff --check`.
- PASS: live source Electron smoke with a fresh `--user-data-dir` and `KANMER_SMOKE_CAPTURE_PATH`. It created a 137,620-byte, 1264×755 PNG. Visual inspection confirmed the real Kanmer board and the visible current marker `KANMER-SMOKE-1787274682303-11524`.

## Governing docs

No ticket-linked governing document applies: this is a spike-profile verification tool with no production product-contract change. GUI-068/FRD-021 is intentionally untouched.

## Boundary and follow-up

This captures the actual Electron **renderer page** reliably on this host. It does not include title-bar/menu chrome or OS-owned dialogs, so it does not by itself satisfy GUI-068's native updater-refusal-dialog screenshot requirement. That real-release/human verification remains explicitly parked on [[GUI-068]].

## Review and merged-main verification

Review the main-process lifecycle ordering, exclusive artifact write, and smoke-only guard. After merge, rerun the exact source Electron smoke command against `main`, inspect the marker-bearing output PNG, and write the proof before closeout.
