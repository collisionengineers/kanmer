# 1.6 The packaged-boot assertion

**File:** `apps/gui/src/main/index.ts`

In the `KANMER_SMOKE` branch inside `createWindow()` (`:176-195`), before the watchdog, add:

```ts
if (app.isPackaged) {
  const feed = join(process.resourcesPath, "app-update.yml");
  if (!existsSync(feed)) {
    console.error(`KANMER_SMOKE: ${feed} is missing — the packaged app has no update feed`);
    app.exit(1);
  }
}
```

Do **not** add a `require.resolve("electron-updater")` check. `updater.ts` imports `electron-updater` statically at module top level, so a missing module makes main fail to load and the process never reaches this code — the smoke exits non-zero by construction, and check 2 above catches it earlier and more legibly.
