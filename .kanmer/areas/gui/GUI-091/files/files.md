# GUI-091 file survey

## Files to change

| File | Change / responsibility | Risk |
|---|---|---|
| `apps/gui/src/main/index.ts` | Add a smoke-only capture sequence after the live renderer is ready: inject/read a unique marker, call `webContents.capturePage()`, write a PNG at an explicitly supplied path, and make failure non-zero. | Lifecycle ordering: must not race `ready-to-show`/renderer paint; ordinary app startup must remain unchanged. |
| `apps/gui/src/main/index.test.ts` or a focused new main-process test | Cover extracted capture-path validation and smoke failure/success decision logic without needing a desktop session. | Avoid a brittle Electron-window unit harness. |
| `apps/gui/README.md` or the existing GUI smoke command documentation in `AGENTS.md` | Publish the opt-in command, output contract, and its renderer-only limitation where agents already find smoke instructions. | Do not claim it captures native OS dialogs. |

## Context files

| File | Why read it |
|---|---|
| `apps/gui/src/main/index.ts` | Sole BrowserWindow owner; already has the smoke watchdog and correct ready-to-show/load ordering. |
| `apps/gui/src/main/settings.ts` | Existing user-global settings must not be altered by a test-only capture route. |
| `apps/gui/src/preload/index.ts` | Confirms no renderer exposure or IPC channel is necessary. |
| `apps/gui/electron.vite.config.ts` | Confirms the main-process bundle/output used by smoke. |
| `AGENTS.md` §6 | Defines the GUI smoke invocation and the mandatory fresh user-data directory. |
| `docs/functional/frd/FRD-021-auto-update.md` | Governs GUI-068; useful only to state its separate native-dialog evidence boundary. |

## Ripple effects and exclusions

- No `window.kanmer` API, IPC contract, renderer component, MCP server, updater algorithm, or release artifact changes are in scope.
- The implementation supplies repeatable **renderer** pixel proof, not OS chrome or a native modal. GUI-068 remains a separately scheduled release verification ticket.
- Output belongs under a caller-provided disposable path, never in the repo or user settings.
