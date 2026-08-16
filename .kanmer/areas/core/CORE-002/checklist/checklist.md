# Checklist

- [x] `stages.ts` with the six constants and the boundary vocabulary
- [x] `statuses` optional-on-read, absent-on-write
- [x] `assertStage` replaces board-derived status validation
- [x] `lastStageId` returns a constant
- [x] `assertFinalStageGates` deleted with a comment saying why
- [x] `ColumnKind` narrowed to `"area"`
- [x] tests: the six in order, threshold arithmetic, unknown stage rejected
