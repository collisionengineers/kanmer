# 8.3 If anyone later takes D7's rename (out of scope; specified so it is not improvised)

**Its own release, nothing else in it:**
1. `app.setName("Kanmer")` as the **first statement** of `main/index.ts`, above `app.requestSingleInstanceLock()` (`:57`) — the lock and every `app.getPath("userData")` resolve against the name, so anything later is too late.
2. In `settings.ts`, before the first `readSettings()`: if `join(app.getPath("userData"), "settings.json")` is absent **and** the legacy dir `join(dirname(dirname(app.getPath("userData"))), "@kanmer", "gui", "settings.json")` exists, copy the legacy `settings.json` (only that file — not the Chromium profile) into the new userData dir and leave the original in place as a rollback. Never `rename`.
3. Accept that the updater cache dir changes to `kanmer-updater`, orphaning the old `%LOCALAPPDATA%\@kanmergui-updater\installer.exe` (~77 MB) — document it, or delete it in the same migration.
4. Accept that a from-source dev run now shares the installed app's single-instance lock and settings — which is precisely why §11 left it alone.
5. Ship it *after* at least two successful auto-update cycles, so the mechanism that would deliver a fix is known-good.
