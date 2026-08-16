# Post-implementation report

Branch `core-022-migration-eperm`.

## File changes

| Path | Change |
|---|---|
| `packages/core/src/io.ts` | `renameWithRetry` (exported, injectable rename as a test seam); `writeFileAtomic` retries and removes its temp in a `finally`; `TMP_FILE_RE` exported. |
| `packages/core/src/io.test.ts` | **New** — 12 tests. `io.ts` had none. |
| `packages/core/src/migrate.ts` | Per-ticket skip in `migrateToV3`; `resumed` + `sweptTempFiles` on `V3Report`; `sweepStaleTemps`. |
| `packages/core/src/migrate.test.ts` | 3 new tests inside the v2→v3 block. |
| `apps/gui/src/main/index.ts` | `startWatch` extracted; `CH.migrate` pauses watcher + sync timer, restores in `finally`. |
| `apps/gui/src/main/kanmerGit.ts` | `ensureIgnore` covers the temp pattern. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | M4 corrected; M5 added. |

## Against the governing docs

**FRD-007 M4** was false — it claimed partial migrations resume safely. It now
states resumption is *per ticket*, and says why the first implementation got it
wrong, so the mistake is not repeatable from the spec. **M5** is new and records
the contention behaviour. **FRD-015 R5** ("writes are atomic") is unchanged in
substance and now true under contention.

## Decisions worth stating

**Retry only three codes.** `EPERM`/`EBUSY`/`EACCES` are what Windows raises for
a blocked replace. Retrying `ENOSPC` or `EROFS` would convert an immediate,
legible failure into a slow one.

**The skip predicate is per ticket, not `detectFormat()`.** The format stamp is
whole-board and deliberately written last — moving it earlier to "fix"
resumability would mark a half-migrated board as done. The question has to be
answered from the ticket.

**Dry runs skip the pause.** A dry run writes nothing, so stopping the watcher
for it would be pointless churn on the common preview path.

**Sweep only temps older than 60 s.** A younger one may belong to a write
happening right now in another process; deleting it would break that write.

## For review

**Core now has a subprocess-free but timing-dependent path.** `renameWithRetry`
sleeps. On the success path it does not, but a permanently-locked file now costs
~545 ms before failing instead of failing instantly. That is deliberate and
bounded, and the exhaustion test asserts the bound.

**The GUI pause is the part with the least test coverage.** There is no
main-process harness for `CH.migrate`, so the pause/restore is verified by
typecheck and reading. The failure mode I most want a reviewer's eye on is the
`finally`: if `startWatch` itself threw, the context would keep a closed watcher
and live sync would be dead for the session.

**`markOwnWrite` is still not called for migration.** With the watcher stopped
there is no event to suppress, so it is unnecessary — but if anyone later
removes the pause, the original self-contention returns silently.

**Not fixed here:** the affected board (a separate call), and the GUI-005 corner
where a board that cannot migrate also cannot be edited.

## What kanmer-verify should run

Full rail; then re-run the real-board fixture on merged main — copy the failing
board to a temp dir, migrate, and assert 0 of 194 rewritten, 48 finished, 5
temps swept, format 3, and a clean second run.
