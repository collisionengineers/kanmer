# 2.5 Scheduling, manual check, and the quit guard

```ts
setTimeout(() => checkForUpdatesNow("auto"), FIRST_CHECK_DELAY_MS);
timer = setInterval(() => checkForUpdatesNow("auto"), CHECK_INTERVAL_MS);
```

`checkForUpdatesNow("manual")` **short-circuits when `state.phase === "downloaded"`** and just re-`send`s the existing state — `checkForUpdates()` on an already-downloaded update resolves from cache and may not re-emit `update-downloaded`, which would make the menu item look broken.

`maybeBlockQuitForUpdate(e)`:

```ts
let quitPromptShown = false;
export function maybeBlockQuitForUpdate(e: Electron.Event): boolean {
  if (state.phase !== "downloaded" || quitPromptShown) return false;
  if (!autoUpdater.autoInstallOnAppQuit) return false;
  const sessions = mcpSessionsSync();                 // Phase 3; sync because before-quit cannot await
  if (sessions.count === 0 && !sessions.unknown) return false;
  e.preventDefault();
  quitPromptShown = true;
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    title: "Install the update?",
    message: `Kanmer ${state.version} will install when you quit.`,
    detail: sessions.unknown
      ? "Agent MCP sessions running from this install will be closed by the installer."
      : `This will close ${sessions.count} agent MCP session(s): ${sessions.projects.join(", ")}. ` +
        "Board data is safe — the agent's connection is what drops.",
    buttons: ["Install and quit", "Quit without installing", "Cancel"],
    defaultId: 0, cancelId: 2, noLink: true,
  });
  if (choice === 2) { quitPromptShown = false; return true; }   // stay open
  if (choice === 1) autoUpdater.autoInstallOnAppQuit = false;   // defer to the next quit
  app.quit();                                                   // re-enter; quitPromptShown blocks a re-prompt
  return true;
}
```
