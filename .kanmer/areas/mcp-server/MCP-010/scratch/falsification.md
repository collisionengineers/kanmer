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
