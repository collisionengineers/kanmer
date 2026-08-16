# Checklist

- [x] banner shows for `format < 3`, wording differs for v1 vs v2
- [x] `CH.migrate` calls `migrateBoard`; `BoardMigrationReport` typed end to end
- [x] v2 section rendered only when the board is not already v2
- [x] stage mapping shown as from → to with counts
- [x] `needsRestage` listed per ticket, not counted
- [x] `docMoves` listed
- [x] `prioritiesStripped` on its own line
- [x] `profileAssignments` summarised
- [x] blockers disable the apply button; `needsRestage` does not
- [x] apply sets format 3 and refreshes
- [x] partial-migration error message unchanged
- [x] `readOnlyClient` rejects all 14 write methods
- [x] `migrate`/`backfillBoard`/`getFormat` still reachable while read-only
- [x] read-only banner states the board is not writable until migrated
- [x] vitest covers the read-only wrapper

## Progress notes

- Blockers and notes are merged across all three steps into `allBlockers` /
  `allNotes`. A v2 blocker stops the run just as surely as a v3 one, and
  splitting them would let someone fix one and be surprised by the other.
- Backfill's `addedStages` had no home in the report, so each added stage
  becomes a note rather than being dropped.
- `migrateToV2` is no longer imported in `main/index.ts`; tsc caught it.
- Worktree `.worktrees/gui-005` shares the root `node_modules` through a
  Windows junction. `npm install` per worktree would re-download Electron.
