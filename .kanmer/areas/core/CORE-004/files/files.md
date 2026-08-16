# Where the change lands

## Files to change

| Path | Why |
|---|---|
| `packages/core/src/docpaths.ts` | **New.** Path parsing/validation, recursive listing, gate satisfaction, reference enumeration. |
| `packages/core/src/store.ts` | `getDoc`/`setDoc`/`getTicketDocsInfo` go path-based; scratch moves into `scratch/`. |
| `packages/core/src/profiles.ts` | Owns the type vocabulary and the gate-exempt set. |
| `packages/core/src/types.ts` | `TicketDocsInfo` gains `counts` and `references`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/paths.ts:127-156` | The v2 `SAFE_DOC_RE`/`docFileIn`/`SCRATCH_PREFIX` trio being replaced — and the traversal guard whose strictness must be preserved per segment. |
| `packages/core/src/io.ts:11-13` | `contentVersion` — the doc concurrency token must keep working across the reshape. |
