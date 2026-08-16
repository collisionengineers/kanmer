# 5.4 Persist the tab session

- Add `openTabs: string[]` + `activeTab: string` to `AppSettings` (`settings.ts:15-21`) + a `setOpenTabs` IPC; restore on boot (eager-open each so background tabs live-update counts + fire toasts; cap at `MAX_RECENT`=8). `recordRecentProject` unchanged (recents = suggestions; open-tabs = session).
