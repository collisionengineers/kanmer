# Post-implementation report

PR [#25](https://github.com/collisionengineers/kanmer/pull/25).

## File changes

| Path | Change |
|---|---|
| `shared/shortcuts.ts` | **New** — the binding table. |
| `scripts/build-manual.mjs` | **New** — markdown → a bundled module; `--check`. |
| `docs/manual/getting-started.md`, `troubleshooting.md` | **New**, hand-written. |
| `renderer/src/manual/chapters.generated.ts` | **New, generated, committed.** |
| `renderer/src/manual/manual.test.ts` | **New** — 8 tests. |
| `renderer/src/components/Manual.tsx` | **New** — the viewer. |
| `renderer/src/App.tsx` | F1, Escape, menu command, `?` handler, **view-shortcut fix**. |
| `renderer/src/components/Settings.tsx` | `?` per tab. |
| `main/index.ts`, `shared/ipc.ts` | Help ▸ Manual; `MenuCommand` gains `manual`. |
| `package.json`, `packages/ui/src/index.ts` | Scripts, barrel. |

## Against the governing docs

**FRD-024** — menu item and F1, sidebar chapters, in-page search, generated
chapters, a shortcuts chapter from the binding table, `?` deep links. Offline by
construction.

## The bug I introduced two tickets ago

`Ctrl+1..3` against a four-view list, left stale by GUI-015. Fixed by deriving
from `VIEW_LABELS`. Recording it plainly: I added the Backlog view, did not
update the shortcut array, and only found it because this ticket had to read the
bindings to generate documentation from them.

## Departures from the ticket's wording

**"a build step generating chapters from the `/docs/` FRDs"** — from a *curated
subset*, not all 24. A manual made of 24 implementer specs is one nobody reads.
The list is explicit in the script, so adding one is a one-line change.

**"wiring 4.5's stub"** — there is no stub. The Help menu had Check for Updates
and a GitHub link; nothing referenced a manual. The deep-link mechanism is new.

## For review

**The shortcuts test does not prove the handler matches the table.** It proves
the chapter matches the table, both directions. The handler is still an
`if/else` chain, so a binding added there and not to the table is undocumented
and untested. Recorded in `shortcuts.ts`; closing it means making the handler
table-driven, which is its own change.

**Nobody has read the manual in the app.** Deep-link targets are asserted to be
real chapter ids — the failure that would look worst — but no one has pressed
F1.

**Chapter prose is FRD prose.** It reads like a spec introduction because it is
one. Honestly sourced and better than nothing; a real manual would be written
for a user rather than harvested from specs.

**`check:manual` is not wired into any gate.** Nothing runs it automatically, so
a stale generated file only fails when someone thinks to check. The repo has no
CI, so this is the same shape as `plugin:check` — a rail step that must be
remembered.

## What kanmer-verify should run

`npm run check:manual`; the 8 manual tests; full suite, typecheck, build, boot;
and with a running app: F1, search for a word, click a `?` in Settings and
confirm it lands on the right chapter.
