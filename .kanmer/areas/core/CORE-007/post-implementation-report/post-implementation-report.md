# Post-implementation report

One migration takes a board from v2 to v3.

**For review:** the `>= 2` widening in `store.ts` is the subtle one. Several
call sites tested `format === 2` to mean "uses the areas/ticket folder layout".
Format 3 uses that layout too, so an equality test silently routed v3 boards
down the v1 path — every doc call failed with "stored in the legacy layout".
Worth checking no `=== 2` remains where the intent is "foldered".

The board write drops `statuses`, `priorities` and the v2 `docs` block and fills
in `profiles`/`defaultProfile`/`groupKinds`/`proofTypes` with `??=`, so a board
that already configured any of them keeps its values.
