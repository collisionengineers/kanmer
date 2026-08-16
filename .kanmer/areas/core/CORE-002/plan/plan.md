# Plan

1. Add `stages.ts`: `STAGES`, `STAGE_IDS`, `FIRST_STAGE`, `LAST_STAGE`,
   `isStageId`, `stageIndex`, `stageName`, plus `BOUNDARIES` and
   `boundaryThreshold` (the boundary vocabulary belongs with the stages it
   names).
2. Drop `statuses` from the board schema, keeping it **optional** so an
   unmigrated board still parses — read-only compatibility per FRD-007
   acceptance 6.
3. Replace status validation with `assertStage`, which needs no board. That is
   the point: a gate can no longer reference a stage that does not exist.
4. Delete `assertFinalStageGates` and its `setBoard` call.
5. Narrow `ColumnKind` to `"area"` and let the compiler find every site.

## Alternative rejected

Keeping stages configurable and warning on dangling gates: treats the symptom.
Skills still could not assume a stage name, and a warning nobody reads is not
enforcement.
