# Where the change lands

## Files to change

| Path | Why |
|---|---|
| `packages/core/src/stages.ts` | **New.** The constant set: ids, names, colours, order, plus the boundary vocabulary and threshold arithmetic. |
| `packages/core/src/types.ts` | `statuses` leaves `BoardConfigSchema` (kept optional for read-side compat with an unmigrated board). `ColumnKind` narrows to `"area"`. |
| `packages/core/src/board.ts` | `defaultBoardConfig()` stops emitting stages; `lastStageId` becomes a constant. |
| `packages/core/src/store.ts` | `assertStage` replaces `assertFieldAgainstBoard(board, "status", …)`; `columnList` narrows; `assertFinalStageGates` is deleted. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/docs.ts:139-166` | The v2 threshold arithmetic — kept verbatim in the new engine, because it already handled multi-stage jumps correctly. |
| `packages/core/src/store.ts` `assertFinalStageGates` | Exists **only** because `statuses` was editable. With a constant final stage the situation it guards cannot arise, so it is removed rather than ported. |
