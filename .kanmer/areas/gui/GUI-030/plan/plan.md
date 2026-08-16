# 5.1 Main: contexts + projectId threading

- **Where:** `main/index.ts:48-50,65-68,306-337,395-465,233-258,317-329`.
- Singletons `store`/`watch` → `Map<projectId, ProjectContext {root, store, watch, format, ownWrites}>`; `requireStore()` → `requireCtx(projectId)`. `openProject(root)` canonicalizes, focus-existing if already open, else builds + adds to the Map, records recent, rebuilds menu; add `closeProject`. Every CRUD handler gains a leading `projectId`. The watcher closure sends `{projectId, event, file}` on `CH.changed`/`CH.agentChange`; `ownWrites` + toast suppression move into the context; reveal/toast carry `projectId`. `getSettings`/`setTheme`/`setNotifications` stay global. `before-quit` closes all watchers.
