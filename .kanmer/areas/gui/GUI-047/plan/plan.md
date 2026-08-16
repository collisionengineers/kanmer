# 2.1 Module shape

```ts
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
```

Static import, deliberately (see 1.6). Module-level constants — no magic numbers inline:

```ts
const FIRST_CHECK_DELAY_MS = 30_000;              // not t=0: it competes with openProject
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;     // Kanmer windows stay open for days
```

Exports:

| Export | Purpose |
|---|---|
| `initUpdater(send: (payload: UpdateStatusEvent) => void): void` | Configure flags, wire events, schedule checks. Called once from `whenReady`. |
| `checkForUpdatesNow(source: "auto" \| "manual"): void` | The Help-menu item and the interval both call this. |
| `installUpdateNow(): void` | `autoUpdater.quitAndInstall(true, true)`. The **only** caller is the `CH.installUpdate` handler. |
| `updateState(): UpdateStatusEvent` | Current state, for a late-mounting/reloaded renderer. |
| `isUpdaterEnabled(): boolean` | Menu-item `enabled:`. |
| `maybeBlockQuitForUpdate(e: Electron.Event): boolean` | The `before-quit` guard (§2.5). |
