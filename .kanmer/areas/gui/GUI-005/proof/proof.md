# Proof

Verified on `v3-phase-minus-1-prework` at merge `5e34cb2` (ticket commit
`e489da7` merged `--no-ff`). Local merge, no PR — see scratch/notes for why.

## Migration on a real format-2 board

`sandbox-harness/.kanmer` copied to a temp dir and driven through
`migrateBoard`. This is the fixture the report asked for: format 2, six items,
carrying a `todo` stage that is not on the format-3 board.

```
format before: 2
stages present: done, implementing, planning, review, todo, verifying

DRY RUN
  v2.alreadyV2: true     backfill added: researching
  v3.alreadyV3: false
  stageMapping: todo→backlog (1), planning→preparing (1),
                implementing→implementing (1), review→review (1),
                verifying→verifying (1), done→done (1)
  needsRestage: []
  docMoves: 0
  prioritiesStripped: 6
  profileAssignments: 5 feature, 1 custom
  blockers: []

APPLIED
  format after: 3
  dry-run == applied: true
  items: 6 → 6
  stages after: backlog, done, implementing, preparing, review, verifying
```

The alias table did its job on real data: `todo` → Backlog and `planning` →
Preparing, with zero needs-restage. **Dry run matched the applied result
exactly** — the criterion the modal's preview depends on, since the preview *is*
the dry run.

Every field the modal renders was populated by this run: the stage-map table has
six rows, priorities-stripped is 6 (so that line shows), profiles summarise as
"5 feature, 1 custom", and needs-restage was empty so its warning correctly did
not render.

## Rail on the merged base

- `npm run test -w @kanmer/core` — 116 tests, 6 files
- `npm run test -w @kanmer/gui` — 136 tests, 17 files (5 new in `readOnly.test.ts`)
- `npm run typecheck -w @kanmer/gui` — both projects clean
- `npm run build -w @kanmer/gui` — clean
- `KANMER_SMOKE=1` boot on a fresh user-data-dir — exit 0

## Found while verifying, filed not fixed

[[CORE-012]] — `migrateToV2`'s guard is `detectFormat() === 2`, so running
`migrateBoard` on a format-3 board downgrades `version.json` to 2 before the v3
step stamps it back. Migration is not idempotent and there is a window where a
v3 board reads as v2. Not reachable from this UI (the banner is `format < 3`
only), so it does not block this ticket. Filed rather than folded in.

## Not proven

The modal rendered against a live format-2 board in the running app. The
migration underneath it is verified on real data and every field is exercised,
but no one has looked at the dialog with their eyes. There is no renderer
component test harness in this repo to close that gap mechanically.
