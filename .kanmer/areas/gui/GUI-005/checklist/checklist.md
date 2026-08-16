# Checklist

- [ ] banner shows for `format < 3`, wording differs for v1 vs v2
- [ ] `CH.migrate` calls `migrateBoard`; `BoardMigrationReport` typed end to end
- [ ] v2 section rendered only when the board is not already v2
- [ ] stage mapping shown as from → to with counts
- [ ] `needsRestage` listed per ticket, not counted
- [ ] `docMoves` listed
- [ ] `prioritiesStripped` on its own line
- [ ] `profileAssignments` summarised
- [ ] blockers disable the apply button; `needsRestage` does not
- [ ] apply sets format 3 and refreshes
- [ ] partial-migration error message unchanged
- [ ] `readOnlyClient` rejects all 14 write methods
- [ ] `migrate`/`backfillBoard`/`getFormat` still reachable while read-only
- [ ] read-only banner states the board is not writable until migrated
- [ ] vitest covers the read-only wrapper
