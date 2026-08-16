# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/migrate.ts` | `migrateToV3`, the alias table, the document-move map, `V3Report`; `migrateBoard` gains the third step. |
| `packages/core/src/version.ts` | `CURRENT_FORMAT` → 3. |
| `packages/core/src/store.ts` | `detectFormat` returns `1 | 2 | 3`; the foldered-layout checks become `>= 2`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/migrate.ts` `migrateToV2` | The behaviours to carry forward, and the resumability idiom (check before act, per file). |
| `packages/core/src/migrate.ts` `CANONICAL_STAGES` | The existing v2 alias table — the new one is the same idea aimed at six targets. |
| `sandbox-harness/.kanmer` | A real format-2 board carrying a `todo` stage: a free alias-table fixture. |
