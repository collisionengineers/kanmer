# 2.6 `main/index.ts` integration

Four edits:

1. **`whenReady`** (`:523-543`) — after `createWindow()`:
   ```ts
   try {
     initUpdater((payload) => mainWindow?.webContents.send(CH.updateStatus, payload));
   } catch (err) {
     console.error("[updater] init failed:", err);
   }
   ```
2. **`buildMenu()` Help submenu** (`:247-255`) — insert *before* "Kanmer on GitHub":
   ```ts
   { label: "Check for Updates…", enabled: isUpdaterEnabled(),
     click: () => checkForUpdatesNow("manual") },
   { type: "separator" },
   ```
   `buildMenu()` re-runs on every `openProject` (recents refresh), so this item must stay cheap and stateless. It is.
3. **`before-quit` → `will-quit` split.** Today `app.on("before-quit", () => { void watch?.close(); })` (`:549-551`). If `maybeBlockQuitForUpdate` calls `preventDefault()`, `preventDefault` does **not** stop other `before-quit` listeners — the watcher would close and the app would keep running with live-reload silently dead. Fix by moving the close:
   ```ts
   app.on("before-quit", (e) => { maybeBlockQuitForUpdate(e); });
   app.on("will-quit", () => { void watch?.close(); });
   ```
   `will-quit` fires only when `before-quit` was not prevented, and `quit` (where `autoInstallOnAppQuit` installs) fires after it. This ordering is correct and strictly better than what is there now.
4. Imports.

**Test (Phase 2, automated):** none — this module is all electron/IO. The pure logic that *is* testable lives in Phase 3 and Phase 5.

**Verify (Phase 2, the dev fast loop — no packaging):**

1. Create `apps/gui/dev-app-update.yml` (gitignored by 1.4):
   ```yaml
   provider: generic
   url: http://127.0.0.1:8080
   updaterCacheDirName: kanmer-updater-dev
   ```
2. Build a fixture feed in `sandbox-harness/feed/` (already gitignored). Copy the existing installer to `Kanmer-Setup-9.9.9.exe`, then compute its sha512 (base64) and byte size, and write `sandbox-harness/feed/latest.yml`:
   ```yaml
   version: 9.9.9
   files:
     - url: Kanmer-Setup-9.9.9.exe
       sha512: <the base64 above>
       size: <the bytes above>
   path: Kanmer-Setup-9.9.9.exe
   sha512: <same base64>
   releaseDate: '2026-08-13T00:00:00.000Z'
   ```
3. `npx http-server sandbox-harness/feed -p 8080`
4. `cd apps/gui && npm run build && KANMER_DEV_UPDATE=1 npx electron . --user-data-dir="<fresh dir>"`

**Expect on stderr:** `[updater]` lines for checking → update-available 9.9.9 → progress → update-downloaded. **Do not click anything** (there is no UI yet, and the payload is a 0.1.0 installer wearing a 9.9.9 label). This proves the event wiring and the flags. It proves nothing about packaging — Phase 1 and Phase 7 do that.

---
