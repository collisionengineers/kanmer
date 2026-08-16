# 2.4 Error handling and logging

**A failed check must never break app start.** Three separate guards:

- `checkForUpdatesNow` does `autoUpdater.checkForUpdates().catch(() => {})` — **empty catch on purpose**: electron-updater emits `error` *and* rejects for the same failure, so handling it in both places double-emits. The `error` listener is the single handler; the `.catch` exists only to stop an unhandled rejection.
- The whole body of `initUpdater` is wrapped in `try { … } catch (err) { log.error(...) }`.
- The `initUpdater(...)` call site in `whenReady` is *also* wrapped, and comes **after** `createWindow()`.

**Does "the MCP server must never write to stdout" (AGENTS §7) apply here? No — and say so in the code comment.** That rule is about the MCP *server* process, whose stdout **is** the transport. `updater.ts` runs in the Electron main process, whose stdout is not a transport; and when the same binary runs as the MCP server (`ELECTRON_RUN_AS_NODE=1`), the entry point is `kanmer-mcp.cjs` and `main/index.ts` is never loaded, so this file cannot execute there. Nevertheless, write to **stderr** for consistency with the existing `KANMER_SMOKE` messages:

```ts
const log = {
  info:  (m: unknown) => console.error("[updater]", m),
  warn:  (m: unknown) => console.error("[updater] warn:", m),
  error: (m: unknown) => console.error("[updater] error:", m),
  debug: (m: unknown) => console.error("[updater] debug:", m),
};
```

No `electron-log` dependency. At init, log one positive line naming the feed by reading the first lines of `join(process.resourcesPath, "app-update.yml")` when packaged — so a packaged run visibly proves it read the exact file the updater reads.
