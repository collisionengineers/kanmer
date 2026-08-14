# Phase 5 — GUI: multi-project tabs

**Goal:** open several projects at once, switched by a tab strip, each with its own board/items/view/selection. Implemented as **per-project contexts in main + `projectId` on every call/payload**, not multiple `BrowserWindow`s. This phase wraps the now-stable Phase 3/4 features, so it's built last among the GUI phases.

**Depends on:** Phases 3, 4 (the single-project features it wraps). **Feeds:** Phases 6/7 (connect/dispatch act on the active tab's root). **Scope:** `@kanmer/gui` main + renderer + shared.

## Design decisions
- **D1 — Per-project `Map` in main, not per-tab windows.** The renderer is one React tree whose singletons (command palette, settings modal, global shortcuts `App.tsx:340-378`, toasts, window-bounds, focus-based toast suppression) assume one window; per-window duplicates all of that and forks the menu/shortcut/toast logic. The Map localizes change to four seams: a `Map<projectId, ProjectContext>` in main, a leading `projectId` on IPC, `projectId` stamped on `changed`/`agentChange`/`reveal`, and a `tabs[]` array in the renderer.
- **D2 — `projectId` = the canonical `projectRoot`.** Roots are already unique and are what recents store; root-as-id dedups "open the same folder twice" into focus-existing, no registry.
- **D3 — `ProjectClient` facade.** A per-tab facade binds `projectId` and exposes the `KanmerApi` methods (`client.getItem(id)`), passed via a React `ProjectContext`. Phase 3/4 components call the facade, so this phase supplies real per-project clients with **zero component churn**.

## Items

### 5.1 Main: contexts + projectId threading — L
- **Where:** `main/index.ts:48-50,65-68,306-337,395-465,233-258,317-329`.
- Singletons `store`/`watch` → `Map<projectId, ProjectContext {root, store, watch, format, ownWrites}>`; `requireStore()` → `requireCtx(projectId)`. `openProject(root)` canonicalizes, focus-existing if already open, else builds + adds to the Map, records recent, rebuilds menu; add `closeProject`. Every CRUD handler gains a leading `projectId`. The watcher closure sends `{projectId, event, file}` on `CH.changed`/`CH.agentChange`; `ownWrites` + toast suppression move into the context; reveal/toast carry `projectId`. `getSettings`/`setTheme`/`setNotifications` stay global. `before-quit` closes all watchers.

### 5.2 Renderer: tabs + per-tab state — L
- **Where:** `App.tsx:32-35,144-217,470-472`, new `TabStrip.tsx`/`ProjectView.tsx`/`lib/client.ts`.
- `root/board/items/format` → `tabs: Tab[]` + `activeId`. A `Tab` holds `{projectId, root, board, items, format, view, filters, search, selectedId, changeSignal, unread, editorDirty, pendingNav, client}`. `App` renders `<TabStrip>` + the active tab's `<ProjectView>` under `ProjectContext.Provider`. `onDiskChange`/`onAgentChange` switch on `payload.projectId` and patch that tab (same scoped-patch algorithm, now on `tabs[i]`); unknown projectIds ignored. `onReveal` focuses the payload's tab (opening it if closed) then `trySelect(id)`.
- **TabStrip polish (native-app feel):** middle-click closes a tab; tabs drag-reorder; a tab with unsaved edits shows a dirty dot (in addition to the unread dot); the window title becomes `<project name> — Kanmer` so the Windows taskbar identifies the active project. **Shortcuts:** Ctrl+1..3 stay view switches (as today, `App.tsx:340-378`); tabs get **Ctrl+Tab / Ctrl+Shift+Tab** cycle (and Ctrl+PgDn/PgUp as the menu accelerators).

### 5.3 Dirty-guard across tabs — M
- The generalized `pendingNav` gains `kind: 'select'|'tab'|'close'`; `trySwitchTab`/`closeTab` route through the same discard modal as `trySelect`. `beforeunload` (`App.tsx:105-114`) must OR across all tabs' `editorDirty`. Because only the active tab's `ProjectView` (hence `Editor`) is mounted, this guard is what prevents silent loss on switch/close.

### 5.4 Persist the tab session — S
- Add `openTabs: string[]` + `activeTab: string` to `AppSettings` (`settings.ts:15-21`) + a `setOpenTabs` IPC; restore on boot (eager-open each so background tabs live-update counts + fire toasts; cap at `MAX_RECENT`=8). `recordRecentProject` unchanged (recents = suggestions; open-tabs = session).

## Risks
- **Id collisions across projects** (`TICK-001` in two tabs) — everything is `projectId`-scoped: `ownWrites`, `knownIds`/wiki-resolution, `selectedId`, toasts, reveal. Command palette scoped to the active tab for v1.
- **Watcher payload routing** — `projectId` on every payload; ignore unknown; base-name doc/item parsing unchanged but applied within the target tab.
- **Eager multi-watch on boot** — N chokidar watchers; acceptable at typical 1–4 tabs (watcher already debounces + ignores temp files); cap restored tabs.

## Release rail
GUI-only. The `projectId` signature change touches `shared/ipc.ts` + `preload/index.ts` + every handler in lockstep (caught by `typecheck`). No tool-reference change.

## Verification
- `npm run typecheck -w @kanmer/gui`; `npm run build -w @kanmer/gui`.
- Boot smoke with one restored tab exits 0; with two sandboxes, `openTabs` restore opens two.
- Live-sync regression (AGENTS.md §10.7): agent `create_item`/`move_item` updates the correct tab; background tabs update their unread dot; GUI edit is seen by the agent's `get_item`.
- Manual: open 2+ projects; switching preserves each tab's view/filters/search/selection; Ctrl+Tab cycles, middle-click closes, drag reorders; window title tracks the active project; close tab; reopen same folder focuses existing; a native toast from project B focuses B's tab; unsaved edit + switch/close → discard modal (dirty dot visible on the tab).
