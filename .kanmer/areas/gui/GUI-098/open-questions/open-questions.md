# Open questions — GUI-098

- [x] **Does the renderer call MCP `get_status`?** — No. Main process inspects Git and composes health through existing `getKanmerGitStatus` IPC.
- [x] **Is a new IPC channel required?** — No. Extend `KanmerGitStatus` response.
- [x] **Which states show the banner?** — Actual board branch differs/is unavailable, or board source is synthesized `default` while active ticket count is greater than zero.
- [x] **Does a new empty default board warn?** — No; `default` plus zero tickets is expected greenfield state.
- [x] **Does inspection repair, checkout, rename, initialize, sync, or block?** — No. It is read-only and informational.
- [x] **What guidance is shown?** — Main-provided deterministic repair text, expected/actual branch/path, and existing Settings → Git navigation where available.
- [x] **When is health refreshed?** — Project open/refresh, on-disk change, manual sync/rename result, and existing focus/status refresh; no high-frequency poller.
- [x] **How are archived/non-ticket items counted?** — `ticketCount` counts non-archived tickets only, matching CORE-034.
- [x] **Does this change board sync or core gate behavior?** — No.

## Parked (explicitly deferred)

No questions are parked.
