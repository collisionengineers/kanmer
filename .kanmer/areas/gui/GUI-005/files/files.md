# Where the change lands

| Path | Why |
|---|---|
| `shared/ipc.ts` | `migrate` returns `BoardMigrationReport` (v2 + backfill + v3) instead of `MigrationReport`. |
| `main/index.ts` | `CH.migrate` calls `migrateBoard`, not `migrateToV2`. |
| `renderer/src/lib/client.ts` | Return type follows. |
| `renderer/src/lib/readOnly.ts` | **New.** `readOnlyClient` + the `WRITE_METHODS` list. |
| `renderer/src/App.tsx` | Banner condition `format < 3`; modal renders the v3 sections; client wrapped when unmigrated. |
| `renderer/src/styles.css` | Stage-mapping table. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/migrate.ts` `V3Report` | The five things the preview must show; the field set is already exactly right. |
| `packages/core/src/migrate.ts` `migrateBoard` | Runs v2 → backfill → v3 in order; `dryRun` threads to all three. |
| `App.tsx:1306-1388` (existing modal) | The vehicle to reuse, and the partial-migration failure message that must survive. |
| `lib/client.ts` `makeClient` | The single chokepoint every renderer write passes through. |
| `packages/core/src/store.ts` `assertStage` | Why writes to an unmigrated board are unsafe: stage validation is against the fixed six regardless of board format. |
