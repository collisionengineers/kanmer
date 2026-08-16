# Where the change lands

No source change — this is an operation on data.

| Path | What happens |
|---|---|
| `.worktrees/kanmer/.kanmer/version.json` | `{format: 2}` → `{format: 3, migratedFrom: 2, migratedAt}` |
| `.worktrees/kanmer/.kanmer/data/board.yml` | `statuses`/`priorities`/`docs` out; `profiles`/`defaultProfile`/`groupKinds`/`proofTypes`/`repoDocs` in |
| `.worktrees/kanmer/.kanmer/areas/**` | 40 ticket files restaged and de-prioritised; 10 documents relocated into type folders |

## Context

| Path | Why it matters |
|---|---|
| `packages/core/src/migrate.ts` `migrateToV3` | The code under test. This run is its acceptance. |
| The `kanmer-board` branch | Every step is committed, so the whole migration is revertable. |
