# Where the change lands

| Path | Change |
|---|---|
| `packages/core/src/io.ts:47-54` | `writeFileAtomic` — retry the rename, clean the temp in a `finally`. An injectable rename so the retry is testable. |
| `packages/core/src/io.test.ts` | **New.** `io.ts` has no test file today. |
| `packages/core/src/migrate.ts:626-662` | Per-ticket skip before the rewrite; `resumed` flag and note. |
| `packages/core/src/migrate.ts:469-485` | `V3Report` gains `resumed` and a swept-temp count. |
| `packages/core/src/migrate.test.ts` | Convergence test; the pegasus-shaped fixture. |
| `apps/gui/src/main/index.ts:639-641` | `CH.migrate` stops the watcher and sync timer, restores both in a `finally`. |
| `apps/gui/src/main/kanmerGit.ts:146` | `ensureIgnore` also ignores the atomic-write temp pattern. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md:36` | M4's resumability claim, corrected. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/io.ts:64-81` `writeFileExclusive` | The shape to copy — `finally { fs.rm(tmp) }` and an explicit error-code branch. It already does what `writeFileAtomic` must. |
| `packages/core/src/migrate.ts:227-251` (v2 move loop) | The check-before-act idiom v3 needs, and the `resumed` flag at `:354-358` that reports it. |
| `packages/core/src/migrate.ts:561-564` | The whole-board early return — the thing that is *not* enough on its own. |
| `packages/core/src/migrate.ts:682-687` | `writeVersion` runs last, deliberately. Do not move it earlier to "fix" resumability; that would mark a half-migrated board as done. |
| `apps/gui/src/main/index.ts:432-445` | How the watcher is created and stored on the context — the restart path must reuse it exactly. |
| `apps/gui/src/main/index.ts:492-496` | How `applyGitPreferences` re-arms `syncTimer`; the migrate handler should re-arm the same way. |
| `apps/gui/src/main/index.ts:465-471` `closeProject` | The only existing `watch.close()` call. A migration must not leave the context holding a closed handle. |
| `packages/core/src/watch.ts:26` | The watcher already ignores `.tmp-` files, so the sweep will not fire spurious events. |
| `packages/core/src/store.ts:421-423`, `docpaths.ts:102,134` | Why leaked temps are inert for reads — the sweep is hygiene, not a correctness fix. |

## Ripple

- Core changes ⇒ `plugin:build` + `plugin:check` (AGENTS.md §8 gotcha 8).
- `writeFileAtomic` is on **every** board write, not just migration. A retry
  loop here is the highest-traffic code path in the product; it must add no
  measurable cost on the success path.

## Out of scope

Repairing the affected board; releasing; the GUI-005 read-only corner
(a board that cannot migrate also cannot be edited — its own ticket).
