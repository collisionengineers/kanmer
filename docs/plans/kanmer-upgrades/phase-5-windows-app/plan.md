# Phase 5 — Real Windows app

**Goal:** make Kanmer behave like a native Windows citizen: icon, taskbar identity, toasts, single-instance, window memory, real menu, keyboard + accessibility. Mostly `apps/gui/src/main` + packaging; renderer for shortcuts/ARIA.

**Depends on:** Phase 4 (dirty guard for Esc/context-menu flows). Order inside the phase: 5.1 before 5.2 (AUMID is a toast prerequisite); 5.3/5.4/5.5/5.8 bundle well (all main-process); build the toast/undo affordances before 5.9.

## Items

### 5.1 App icon + AppUserModelID — S
- **Where:** new `apps/gui/build/icon.ico`, `apps/gui/src/main/index.ts`, `apps/gui/electron-builder.yml`.
- `buildResources: build` already points at a **nonexistent** dir — ship a multi-size `icon.ico` (16–256px; generate a placeholder mark) and electron-builder picks it up for exe/NSIS/shortcuts; set `icon` on the BrowserWindow for dev mode. Add `app.setAppUserModelId("com.kanmer.app")` first thing in `whenReady` — must equal `appId` (electron-builder stamps it on the Start-Menu shortcut; required for Windows toasts + correct taskbar grouping).

### 5.2 Native toasts for agent changes — M
- **Where:** `main/index.ts` (watcher callback), `shared/ipc.ts` (+1 event channel), `settings.ts` (toggle, default ON).
- Watcher fires for GUI writes too — suppress self-events by recording own-write markers (item id + timestamp) in the update/move/create/delete/setBoard IPC handlers; skip watcher events matching a marker <2s old. Otherwise, when `!mainWindow.isFocused()`: `new Notification({ title: "TICK-012 moved to Review", body: title })` via `store.getItem`; batch >3 events in 5s into one summary toast. `on("click")` → restore/focus + send a `kanmer:reveal` event → App selects the item. Settings toggle; unfocused-only.

### 5.3 Single-instance lock — S
- `requestSingleInstanceLock()` else `app.quit()`; on `second-instance`, restore + focus the window.

### 5.4 Window state persistence — S
- **Where:** `main/settings.ts`, `index.ts`. Extend `AppSettings` with `windowBounds {x,y,width,height,maximized}`; save `getNormalBounds()` + `isMaximized()` on close (debounced resize/move); validate restored bounds intersect a display via `screen.getAllDisplays()`, else fall back to 1280×820. No new dependency.

### 5.5 Real application menu; DevTools out of prod — S
- `Menu.setApplicationMenu(buildFromTemplate(...))`: File (Open Project… Ctrl+O → IPC to renderer, Recent submenu from `readSettings().recentProjects`, Exit), View (zoom roles; Reload/Toggle DevTools only when `!app.isPackaged`), Help (repo link via `shell.openExternal`). Today the shipped app exposes the stock Electron menu including DevTools.

### 5.6 Keyboard shortcuts — M
- **Where:** `App.tsx` global keydown, `FilterBar.tsx` (search ref), `Editor.tsx`.
- **Esc** closes Settings, else editor (through the Phase 4 dirty guard); **Ctrl+S** save; **Ctrl+N** new ticket (opens first-column QuickAdd); **Ctrl+F** or `/` focuses search; **Ctrl+1/2** views; **Ctrl+,** Settings. Skip when target is input/textarea except Ctrl+S/Esc.

### 5.7 Focus + ARIA basics + keyboard move — M
- **Where:** `Settings.tsx`, `Board.tsx`, `Editor.tsx`, `styles.css`. Today there are zero `aria-`/`role`/`tabIndex` attributes in the renderer.
- Modal: `role="dialog"`, `aria-modal`, ~20-line focus trap (focus first control, Tab-cycle, restore on unmount). Cards: `tabIndex={0}`, `role="button"`, Enter/Space selects, `:focus-visible` outline, `aria-label` including the area name (fixes color-only encoding). Keyboard drag equivalent: focused card + Ctrl+←/→ moves to prev/next stage, announced via one `aria-live="polite"` region. Labels on icon-only buttons (↑ ↓ ✕ swatches).

### 5.8 Theme "system" + startup-flash fix — M
- **Where:** `settings.ts` (Theme = dark|light|system), `index.ts`, `App.tsx`, `Settings.tsx`.
- Resolve via `nativeTheme.shouldUseDarkColors`, subscribe to `nativeTheme.on("updated")` → push resolved theme over IPC. Flash fix: `readSettings()` is sync — resolve theme **before** `new BrowserWindow` and set `backgroundColor` to match (today it's hardcoded dark, so light-theme users get a dark flash every launch); optionally `show: false` + `ready-to-show`.

### 5.9 Context menus — M
- **Where:** `index.ts` (new `showItemMenu` IPC), `preload/index.ts`, `shared/ipc.ts`, `Board.tsx`, `ItemList.tsx`.
- Card right-click → IPC → native `Menu.popup()` in main: Open, Move to ▸ (stage submenu), Take/Release, Archive/Unarchive, Copy ID, Copy `[[wiki-link]]`, Delete. Return the chosen action descriptor to the renderer and dispatch through existing App handlers so dirty-guard and toast logic stay in one place.

### 5.10 Delete = Archive — S/M
- **Where:** `Editor.tsx`, `App.tsx`, `FilterBar.tsx`.
- GUI Delete now archives (decision locked). Permanent delete moves behind an archived-items view: the existing "Archived" filter becomes a proper view listing archived items with **Restore** and **Delete permanently** (2-click confirm retained). MCP `delete_item` unchanged for agents.

## Verification
- `npm run dist`; installed app: icon in installer/taskbar/window; one taskbar group; second launch focuses the first; toast arrives when unfocused and an agent moves a ticket, clicking it reveals the item; no toast for the GUI's own writes.
- Window size/position/maximized survive relaunch; menu has no DevTools when packaged; light theme launches without a dark flash; OS theme switch follows in "system".
- Keyboard-only session: Tab to a card, Enter opens, Ctrl+→ moves stage (screen-reader announcement), Esc closes, Ctrl+, opens Settings, focus trapped and restored.
