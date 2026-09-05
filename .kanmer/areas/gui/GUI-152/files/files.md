# Files — GUI-152: Focus Board (UI-A + UI-B)

All paths repo-root-relative. Every edit lands in `.worktrees/GUI-152` on branch
`GUI-152-focus-board-scopes`.

## Changed

| Action | Path | Responsibility | Risk |
|---|---|---|---|
| Add | `docs/functional/frd/FRD-036-focus-board.md` | The governing doc: scopes, pipeline, bound, rail, preferences, parity | Low. `verify:docs` may want the doc-structure mirror regenerated |
| Add | `apps/gui/src/renderer/src/lib/scopes.ts` | `Scope`, `SCOPES`, `stagesForScope`, `scopeItems`, `scopeCounts`, `scopeLabel` | Low — pure, no imports beyond `import type` + `shared/stages.js` |
| Add | `apps/gui/src/renderer/src/lib/scopes.test.ts` | Scope table, archived exclusion, counts | Low |
| Add | `apps/gui/src/renderer/src/lib/paging.ts` | `pageColumn`, `clampPage`, `PAGE_SIZE` | Low — pure |
| Add | `apps/gui/src/renderer/src/lib/paging.test.ts` | Clamp, no false empty page, filter-before-page, 2,000-item board | Low |
| Add | `apps/gui/src/renderer/src/components/Sidebar.tsx` | The rail: Workspace scopes with counts, Areas, Standup, collapse | Medium — new a11y surface |
| Add | `apps/gui/src/renderer/src/components/Sidebar.test.tsx` | Counts, `aria-current`, keyboard, collapse | Low |
| Modify | `apps/gui/src/renderer/src/components/Board.tsx` | Columns from `stagesForScope`; per-column pager; compact card with one group chip + `+N` | **High** — drag/drop, Ctrl+Arrow, gate tint, `memo` discipline and column-scoped `order` all live here |
| Modify | `apps/gui/src/renderer/src/components/Board.test.tsx` | Extend: pager renders, counts, no false empty; keep the existing anchor test | Medium — the existing test indexes `.cell` by position, which scoping changes |
| Modify | `apps/gui/src/renderer/src/App.tsx` | `scope` state, routing, counts, search-opens-anything, prefs load/save, per-tab state | **High** — 2,055 lines, the shell's hub |
| Modify | `apps/gui/src/renderer/src/styles.css` | `.sidebar`, `.col-pager`, compact-card rules; reduced motion; narrow-window collapse | Medium — `stylesCheckRule.test.ts` asserts rule presence/absence |
| Modify | `apps/gui/src/main/settings.ts` | `ViewPrefs`, `viewPrefs` on `AppSettings`, normalisation in `readSettings`, `setViewPrefs` | Medium — every settings write rewrites the whole file; an unnormalised field is silently dropped |
| Modify | `apps/gui/src/main/settings.test.ts` | Normalisation + round-trip for `viewPrefs` | Low |
| Modify | `apps/gui/src/shared/ipc.ts` | `CH.getViewPrefs` / `CH.setViewPrefs`, `ViewPrefs` type, two `KanmerApi` methods | Medium — three files must agree |
| Modify | `apps/gui/src/preload/index.ts` | Two forwarders | Low |
| Modify | `apps/gui/src/preload/index.test.ts` | Channel coverage if the test enumerates the API | Low |
| Modify | `apps/gui/src/main/index.ts` | Two `ipcMain.handle`s; resolve `project_id` via `ctx.store.getProject()` | Medium — must not add a path field to the boundary |

## Ripple

- **`lib/views.ts` is deliberately untouched.** Its `View` union stays
  `ticket | standup | archived`; `views.test.ts` must stay green unedited. Scope
  is a separate axis and a separate module.
- **`FilterBar.tsx`** keeps its props; the sidebar sets `filters.area` through
  the same `onFilters` callback, so the two cannot disagree.
- **`ArchivedList.tsx`** is unchanged and is what the `archived` scope renders.
- **`ContextMenu.tsx` / `CommandPalette.tsx`** are unchanged; App's palette
  handler gains the scope/page switch when it opens an off-page item.
- **`docs/contributing/doc-structure.md`** is a generated mirror — regenerate it
  only if `verify:docs` says the new FRD made it stale.
- **`apps/gui/src/renderer/src/manual/`** — the in-app manual may describe the
  views; check whether `check:manual` flags it.

## Deliberately out of scope

Board/List toggle and the table view, Pinned, `expectedRevision` on GUI moves
and the conflict UI, keyboard stage-move parity audit, time-in-stage, packaged
qualification against the previews, any Electron/runtime change, and anything
under `packages/**`, `plugins/**`, `scripts/**` or `.github/**` (other lanes own
those; read-only here).

## Context files — read before touching the changed ones

| Path | What it tells you |
|---|---|
| `AGENTS.md` §8 gotcha 9 | `order` is column-scoped while the board renders by area; `Card` is memoised and takes primitives; `e.stopPropagation()` on the card drop is load-bearing |
| `AGENTS.md` §8 gotcha 15 | Project identity is `.kanmer/project.json`, not `board.yml` |
| `apps/gui/src/renderer/src/lib/board.ts` | `mergeColumns`' `known` argument; `columnCards`; `positionForDrop`; `optimisticOrder` |
| `apps/gui/src/renderer/src/lib/views.ts` | Why `viewItemsFor` takes no filter argument |
| `docs/functional/frd/FRD-019-gui-shell.md` R5a/R5b/R5c | Badge vs column count — two numbers answering two questions |
| `apps/gui/src/renderer/src/lib/stylesCheckRule.test.ts` | Which CSS selectors must exist and which must stay deleted |
| `Kanmer_Upgrade_Pack_2026-09-05/09_FOCUS_BOARD_IMPLEMENTATION.md` | The binding contract, including its 2026-09-05 amendments |
| `Kanmer_Upgrade_Pack_2026-09-05/approved-ui/source/prototype.js` | `CONCEPT === 1`: `byScope`, `focusSidebar`, `column`, `card`, `focusView` |
