# Research — GUI-098: board-worktree health banner

## Findings

- The GUI already owns board Git lifecycle in `apps/gui/src/main/kanmerGit.ts` and exposes `KanmerGitStatus` through existing `getKanmerGitStatus` IPC. The renderer must not call MCP `get_status`.
- CORE-034 adds/defines a small observational branch inspector in `kanmerGit.ts`, deliberately duplicated from the MCP server and cross-referenced by comment. It must report actual branch without repairing it.
- `ensureBoardWorktree` may create/reconcile a worktree during project open, but health must still be independently inspected each time status is requested/refreshed; cached configured branch is not proof of actual checkout.
- Extend existing `KanmerGitStatus` with nested health data rather than creating an IPC channel:
  - path
  - expectedBranch
  - actualBranch
  - onBoardBranch
  - boardSource (`file | default`)
  - ticketCount
  - repair.
- `boardSource` and active ticket count come from the project’s `KanmerStore` in the main process (`getBoardWithSource`/`listItems`); Git inspection remains in `kanmerGit.ts`. The existing status handler can compose them.
- Banner conditions are exact:
  1. Git board worktree is available and `onBoardBranch === false`; or
  2. `boardSource === "default" && ticketCount > 0` (ticket files exist but board configuration is synthesized, so tickets/config are inconsistent).
  A truly new empty default board (`ticketCount === 0`) is healthy and must not warn.
- Inspection failure/detached HEAD is represented as `actualBranch:null`, `onBoardBranch:false` and must show the wrong/unavailable-branch banner.
- Banner is informational and persistent while unhealthy. It must not auto-checkout, initialize, sync, rename, block editing, or offer a one-click destructive repair.
- Use the repair string returned by main as the primary guidance and provide a link/button to open Settings → Git only if the existing settings navigation can be reused without new view/API.
- Refresh health on project open, on-disk change/board refresh, manual sync result, settings branch rename, and window focus or an existing status refresh point; avoid a high-frequency polling loop.

## Tests

- Main helper tests: expected branch, wrong branch, detached/non-Git, environment/config override, no repair side effect.
- Status composition tests: file/default source and active-ticket count.
- Renderer/pure banner tests: wrong branch visible with actual/expected/path; synthesized default with tickets visible; healthy branch/file board hidden; empty default hidden; error does not crash board.
- Verify no Git command mutates state during inspection.

## Remaining unknowns

None. DOC-011 owns FRD-020/FRD-019 documentation; keep `docs_todo` until linked.
