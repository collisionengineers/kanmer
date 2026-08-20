# Files — GUI-098

## Modify

| Path | Exact change |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Use/finish CORE-034’s observational `inspectBoardWorktree` helper; no repair. Return actual/expected branch/path/on-branch and paired-copy comment. |
| `apps/gui/src/main/kanmerGit.test.ts` | Test expected/wrong/detached/unavailable branch and prove inspection leaves refs/HEAD/worktree unchanged. |
| `apps/gui/src/shared/ipc.ts` | Extend existing `KanmerGitStatus` with nested `boardWorktree` health type; no channel addition. |
| `apps/gui/src/main/index.ts` | Compose inspector output with `getBoardWithSource`, active ticket count, and repair text in existing `getKanmerGitStatus`; update cached status after open/sync/rename without mutating for inspection. |
| `apps/gui/src/renderer/src/App.tsx` | Load/refresh existing Git status and render a persistent health banner under project/tab header when exact unhealthy predicates apply; board remains usable. Reuse existing Settings-open path if providing guidance. |
| `apps/gui/src/renderer/src/components/BoardWorktreeBanner.tsx` | Add a small presentational component or keep equivalent local component if App conventions prefer; display actual/expected/path/source/count/repair accessibly. |
| `apps/gui/src/renderer/src/components/BoardWorktreeBanner.test.tsx` | Prove wrong branch/default-with-tickets show, healthy/file and empty-default hide, repair/action callback works, no crash on null branch. |
| `apps/gui/src/renderer/src/styles.css` | Minimal warning banner styles using existing banner tokens; no layout redesign. |

## Reuse unchanged

- Existing `getKanmerGitStatus` IPC/preload method.
- Existing Settings → Git UI/status/sync actions.
- `KanmerStore.getBoardWithSource()` and `listItems` in main process.
- CORE-034 helper semantics and repair wording.

## Do not modify

- MCP server/get_status, core gates/take behavior, board auto-repair/sync semantics, view roster, ticket data, package/lock/plugin/manual files.
- Add polling service, new IPC channel, MCP client in renderer, auto checkout/rename/init, or blocking modal.
