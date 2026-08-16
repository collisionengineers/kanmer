## BEFORE — falsification evidence, captured on unmodified `main` (5d0e0d7), 2026-08-16

Invoked exactly as `plugins/kanmer/.mcp.json` / `plugins/kanmer/mcp/claude.mcp.json` do:
`node <repo>/packages/mcp-server/dist/index.js` with **no `--root`**, `cwd` = the repo
root `C:\Users\PC\Documents\GitHub\kanmer`, `KANMER_ROOT` stripped from the environment.

stderr:

```
kanmer-mcp ready — root: C:\Users\PC\Documents\GitHub\kanmer
```

`get_status`:

```json
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer",
  "kanmerDir": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.kanmer",
  "exists": false,
  "format": 3,
  "boardSource": "default",
  "deploymentTracking": false,
  "counts": { "byStage": { "backlog": 0, "preparing": 0, "implementing": 0,
                           "review": 0, "verifying": 0, "done": 0 },
              "byType": {}, "offBoardStage": 0, "archived": 0, "taken": 0 },
  "warningsCount": 0
}
```

The server booted cleanly, announced itself "ready", and reported an empty board.
The real board — this one — sits at
`C:\Users\PC\Documents\GitHub\kanmer\.worktrees\kanmer\.kanmer` and is never
mentioned. Exit code 0. Nothing anywhere says a board was missed.

That is the defect in one paste: not an error, a *plausible wrong answer*.

## AFTER — the identical invocation on the fix, 2026-08-16

Same script, same flags (none), same cwd (`C:\Users\PC\Documents\GitHub\kanmer`),
`KANMER_ROOT` stripped; only the server binary differs — built from
`mcp-010-resolve-board-root`.

stderr:

```
kanmer-mcp ready — root: C:\Users\PC\Documents\GitHub\kanmer\.worktrees\kanmer (cwd-worktree)
```

`get_status`:

```json
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer",
  "rootSource": "cwd-worktree",
  "kanmerDir": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer\\.kanmer",
  "exists": true,
  "format": 3,
  "boardSource": "file",
  "counts": { "byStage": { "backlog": 14, "preparing": 15, "implementing": 3,
                           "review": 0, "verifying": 0, "done": 112 },
              "byType": { "ticket": 144 }, "offBoardStage": 0,
              "archived": 1, "taken": 4 },
  "warningsCount": 0
}
```

`exists: false` → `true`. `boardSource: "default"` → `"file"`. 0 tickets → 144.
And `rootSource` now says *how*, so the answer is checkable rather than merely
plausible.

## The not-found diagnostic, verbatim

A board-less directory, no `--root`, no `KANMER_ROOT`. Exit code **1**:

```
kanmer-mcp fatal: no Kanmer board found. Tried:
  C:\Users\PC\AppData\Local\Temp\noboard-Za7zSV\proj\.kanmer
  C:\Users\PC\AppData\Local\Temp\noboard-Za7zSV\proj\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\Temp\noboard-Za7zSV\.kanmer
  C:\Users\PC\AppData\Local\Temp\noboard-Za7zSV\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\Temp\.kanmer
  C:\Users\PC\AppData\Local\Temp\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\.kanmer
  C:\Users\PC\AppData\Local\.worktrees\*\.kanmer
  C:\Users\PC\AppData\.kanmer
  C:\Users\PC\AppData\.worktrees\*\.kanmer
  C:\Users\PC\.kanmer
  C:\Users\PC\.worktrees\*\.kanmer
  C:\Users\.kanmer
  C:\Users\.worktrees\*\.kanmer
  C:\.kanmer
  C:\.worktrees\*\.kanmer
 Pass --root <board>, set KANMER_ROOT,
 or pass --init to create one here.
```

Every path, in order, then all three recoveries — the operator's preview,
literally.
