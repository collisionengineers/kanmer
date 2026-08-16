# 2.2 Guards and flags

```ts
export function initUpdater(send) {
  if (process.env["KANMER_SMOKE"]) return;                          // the boot smoke makes no network calls
  if (!app.isPackaged && !process.env["KANMER_DEV_UPDATE"]) return; // a normal `npm run dev:gui` never hits the network
  if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true;     // reads apps/gui/dev-app-update.yml

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;   // 6.8.9 warns on every download otherwise; we never use nsis-web
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = log;                 // §2.4
  …
}
```

`KANMER_DEV_UPDATE=1` is the opt-in dev hook — it is what makes the Phase 2 fast-loop test possible without packaging, and it means the updater is inert in every other dev run.
