# GUI-091 research — native Electron capture

## Question

Can an agent capture pixels from the running Kanmer Electron renderer on this Windows host without CDP or GDI, and retain a repeatable method for future native-window proof?

## Findings

1. **The previous failure is limited to external capture routes.** The ticket records that CDP screenshot/screencast and GDI `PrintWindow` failed while CDP DOM evaluation stayed live. [[GUI-065]] therefore used a headless-Chromium stylesheet render only; that does not cover native chrome or dialogs. [[GUI-068]] remains the concrete consumer for a native refusal-dialog image.
2. **Electron has a supported in-process route.** Electron's official `webContents.capturePage([rect, opts])` API is a main-process method returning `Promise<NativeImage>`; without a rect it captures the visible page. It is not the CDP endpoint and does not use GDI `PrintWindow`. The API also supports `stayHidden` for a deliberately hidden browser window. Source: Electron WebContents API, `capturePage` (accessed 2026-08-21).
3. **Kanmer already owns a bounded test-only lifecycle hook.** `apps/gui/src/main/index.ts` creates the sole `BrowserWindow` and has `KANMER_SMOKE` handling after `did-finish-load` / `ready-to-show`. A capture hook there can be opt-in by environment variable, run only after a known current DOM marker is injected, write an explicit PNG output path, then exit with success/failure. It needs no renderer API, normal IPC channel, CDP port, or production UI.
4. **A PNG alone is insufficient evidence of freshness.** The smoke route should set a unique marker in the live DOM immediately before capture and assert both that the marker readback succeeded and that the resulting `NativeImage` is non-empty. The ticket proof can then inspect the generated PNG and record its dimensions/path; this proves a current renderer image, though it cannot include OS-owned modal/dialog pixels outside web contents.

## Decision / implication

Implement a narrow `KANMER_SMOKE_CAPTURE_PATH` capability in the Electron main process. It will capture the actual live renderer via `mainWindow.webContents.capturePage()`, write the PNG atomically enough for a disposable test output location, and fail smoke mode if the marker/capture/write is invalid. A focused automated test should cover the pure helper/guard conditions; a real Electron smoke run provides the platform evidence.

This resolves the recurring renderer-photograph problem. It does **not** photograph native OS dialog pixels, so GUI-068's exact updater refusal-dialog visual requirement still needs a native-window capture technique or human review when a release is cut.
