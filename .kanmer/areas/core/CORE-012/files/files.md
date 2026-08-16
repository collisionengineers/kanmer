# Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/migrate.ts:84` | The guard: `=== 2` → `>= 2`. |
| `packages/core/src/migrate.test.ts` | Idempotence assertion — a third `migrateBoard` run must be a no-op. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `migrate.ts:558` (`migrateToV3`'s guard) | The correct shape, and why `=== 3` is fine there: 3 is the maximum, so equality and `>=` coincide. Do not "consistency-fix" it. |
| `migrate.ts:702` `migrateBoard` | Why the bug self-conceals — the v3 step immediately restamps to 3, so the downgrade is only visible mid-run or in the report. |
| `store.ts:163` `detectFormat` | Returns `1 | 2 | 3`; the version file is authoritative and re-stat'ed each call. |
| `store.ts:200` (`format === 1`) | A deliberate equality on the legacy branch — the sweep must not touch it. |
