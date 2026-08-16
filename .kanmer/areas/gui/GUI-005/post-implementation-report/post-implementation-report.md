# Post-implementation report

Commit `e489da7` on `gui-005-format-3-migration-prompt`.

## File changes

| Path | Change | Why |
|---|---|---|
| `shared/ipc.ts` | `BoardMigrationReport` added; `migrate` returns it | The GUI needed all three steps, not just v2's report. |
| `main/index.ts` | `CH.migrate` → `migrateBoard`; `migrateToV2` import dropped | The umbrella already chains v1→v2 → backfill → v→3 and threads `dryRun`. |
| `lib/client.ts` | Return type follows | — |
| `lib/readOnly.ts` | **New** — `readOnlyClient`, `WRITE_METHODS` | The decline path. |
| `lib/readOnly.test.ts` | **New** — 5 tests | — |
| `App.tsx` | Banner `format < 3`; modal rewritten; client wrapped when unmigrated; `allBlockers`/`allNotes` | The prompt itself. |
| `styles.css` | `.stage-map`, `.modal.migrate h3` | — |

## Against the governing doc

**FRD-007 M3** — declining leaves read-only compat with the banner. The banner
states it in both the v1 and v2 wordings; `readOnlyClient` enforces it.

**FRD-007 acceptance 6** — the preview shows mapping counts per alias
(`stage-map` table), the needs-restage list, folder-move and priority-strip
counts, and the profile-assignment summary. All five `V3Report` fields surface.

## Risks and follow-ups

**The read-only guard is presentational.** It wraps the renderer's client, which
is the only path a component has to IPC, so no GUI control can bypass it. But
the main-process handlers accept writes regardless — an unmigrated board is
still writable by anything that is not this renderer. Core's `assertStage`
rejects the genuinely dangerous case (a move to a legacy stage) but an
`update_item` on other fields would go through. Worth a main-side guard;
deliberately not smuggled into this ticket.

**`prioritiesStripped` is a count, not a list.** Unlike `needsRestage` the user
cannot see which tickets lose what. `V3Report` does not carry the values, so
listing them would mean changing core's report shape.

**Not verified against a real v2 board.** Everything below is from the code and
the type system; no format-2 fixture was migrated through this UI. That is what
`kanmer-verify` should do on merged main.

## What kanmer-verify should run

1. `sandbox-harness/.kanmer` is format 2 with a stage `todo` that is not on the
   default board — open it and confirm the banner appears with the v2 wording.
2. Confirm the board renders and every write control refuses with the read-only
   message; confirm Migrate still works while read-only.
3. Click Migrate, check the preview lists the `todo` mapping and any
   needs-restage tickets **by id**, then apply and confirm the applied result
   matches the dry run.
4. Full rail: `npm test`, both smokes, `typecheck -w @kanmer/gui`,
   `build -w @kanmer/gui`, `KANMER_SMOKE=1` boot.
