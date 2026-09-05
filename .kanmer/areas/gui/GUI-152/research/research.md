# Research — GUI-152: Focus Board (UI-A + UI-B)

## Question

What does the renderer do today with `view`, `items`, filters and columns, and
what has to change so the approved Focus Board reference can be implemented
against real data without breaking any existing operation?

## Findings

### F1 — The view model is already centralised, and deliberately filter-blind

`apps/gui/src/renderer/src/lib/views.ts` keys each view's label, item set and
badge together (`VIEWS`, `VIEW_IDS`, `viewItemsFor`, `viewCount`,
`viewCounts`). `View = "ticket" | "standup" | "archived"`. `viewItemsFor` takes
`(view, items)` and **no filter argument** — that signature is the mechanism
that keeps a tab badge from seeing a filter (FRD-019 R5a/R5c). `views.test.ts`
asserts badge == unfiltered rows across every view, so a new member of `VIEWS`
is covered without editing the test.

*Implication:* scopes must not be added as members of `VIEWS`. A scope is a
second, orthogonal dimension inside the `ticket` view; adding five scopes to
`VIEWS` would put them in the tab strip and in Ctrl+1…9. `scopes.ts` is
therefore a new module, and `views.ts` is left alone.

### F2 — `App.tsx` already has the two-stage pipeline, just without scope or page

`App.tsx:1265-1269`:

```
const allViewItems = useMemo(() => viewItemsFor(view, items), [items, view]);
const viewItems  = useMemo(
  () => applyFilters(allViewItems, search, view === "archived" ? EMPTY_FILTERS : filters),
  [allViewItems, search, filters, view]);
```

`applyFilters` is a local function at `App.tsx:2026`. `tabCounts` is
`viewCounts(items)` and is deliberately *not* derived from `viewItems`.
`items` is the whole board including archived (`listItems({ includeArchived: true })`,
`App.tsx:261`).

*Implication:* scope slots in between `viewItemsFor` and `applyFilters`; paging
slots after the sort inside `Board.tsx`. Nothing in the existing chain has to be
re-ordered — only extended.

### F3 — Columns are built in `Board.tsx`, not `App.tsx`

`Board.tsx` renders
`mergeColumns(STAGES.map(...), items.map(i => i.status), STAGES.map(s => s.id))`
— all six stages, always. Its third argument (`known`) is what keeps a
deliberately-hidden stage out of the unknown-status fallback column (GUI-069,
`lib/board.ts:31-49`). Cards inside a column are `columnCards(items, status.id)`
(sorted by `order` then id) and then grouped by area (`groupByArea`).

*Implication:* `stagesForScope` supplies the *rendered* list and the full stage
list stays the `known` argument, so scoping a stage out cannot resurrect it as a
fallback column.

### F4 — Manual order is column-scoped and the drop maths already knows it

AGENTS.md §8 gotcha 9 and `lib/board.ts:60-147`: `order` is column-wide,
`positionForDrop`/`optimisticOrder` must be fed `columnCards(items, statusId)`
— never a rendered group's cards. `Board.tsx` holds `itemsRef` precisely so the
drop handler sees current items without rebuilding memoised `Card`s.

*Implication:* paging must change only what is *rendered*. `onCardDrop` keeps
computing from `columnCards(itemsRef.current, statusId)`. A drop next to a
visible card is always expressible against the full column, so the honest bound
is "you can only drop beside a card you can see"; the context-menu move
(`ContextMenu.tsx`, "Move to ▸") stays the unbounded alternative and the pager
is what reaches the rest of the column.

### F5 — `Card` is memoised and takes primitives only

`Board.tsx:221` — every prop is a primitive or a stable callback on purpose;
passing the `blocked` `Set` or the drop-hint object in would re-render the whole
board on every dragover. Compact-card work must keep that discipline (the group
chip becomes a computed string + a number, not an array).

### F6 — Settings are user-global and written under one file lock

`apps/gui/src/main/settings.ts`: `readSettings()` normalises every field with an
explicit fallback; every writer goes through `withSettingsFileLock` →
`writeSettings` (temp file + `renameSettingsFile` with the Windows EPERM/EBUSY
retry). `setPreferences(patch)` is the exact pattern to copy: IPC channel in
`CH` (`shared/ipc.ts:85`), method on `KanmerApi` (`ipc.ts:637`), preload
forwarder (`preload/index.ts:38`), `ipcMain.handle` (`main/index.ts:1283`).

### F7 — Logical project identity already has a main-process reader

`ctx.store.getProject()` returns core's `ProjectRecord | null` (`store.ts:756`,
reading `.kanmer/project.json`); `main/index.ts:298-311`
(`registrySelectedIdentity`) already uses exactly that. `projectId` on the IPC
boundary is the *canonical root path* (`main/index.ts:146,700`), which is the
transient-worktree key AGENTS.md §8 gotcha 15 and the Focus Board contract both
say not to key preferences by.

*Implication:* `getViewPrefs`/`setViewPrefs` take the IPC `projectId` (a root
path, as every other project-scoped IPC method does) and resolve it to the
logical `project_id` **inside main**, falling back to the root path when
`project.json` is absent. The renderer never sees the uuid, and no new path
field crosses the boundary.

### F8 — What the approved reference actually specifies

`approved-ui/source/prototype.js` (`CONCEPT === 1`):

- `byScope` — `archived` → `t.archived`; every other scope excludes archived
  first; `all` → everything; `active` →
  `['preparing','implementing','review','verifying']`; otherwise
  `t.stage === scope`.
- `focusSidebar()` — a `Workspace` caption then
  `[['Active work','active'],['All tickets','all'],['Backlog','backlog'],['Completed','done'],['Archived','archived']]`,
  each through `nav(...)`, which emits `aria-current="page"` when active and a
  count; then `commonAreas()` (`All areas` + one per area); then a bottom group
  with Pinned (out of scope, GUI-153) and Standup.
- `column(stage, rows)` — page size **4**, `pages = max(1, ceil(rows.length/4))`,
  `n = min(n, pages)`, a header with the stage name and the **unpaged** row
  count, a `column-cards` region, and a footer pager reading
  `${(n-1)*4+1}–${min(n*4, rows.length)} of ${rows.length}` with prev/next
  disabled at the ends.
- `focusView()` — `sorted(filtered(byScope()))` **then** column slicing. Filter
  before page, exactly as the contract demands.
- `card(t)` — an id row (with a Blocked pill on the right), then an `<h3>`
  heading, then one context line (area), then owner + age.

`09_FOCUS_BOARD_IMPLEMENTATION.md` adds the rules the prototype cannot express:
four cards is a display bound and not a WIP limit; counts distinguish
total/filtered/shown; the most relevant group chip plus a compact `+N`, with the
full list in detail; manual ordering uses the full status column; preferences are
per logical project; the prototype's numbers are fake and must never be copied
into product code. Its 2026-09-05 amendments confirm `expectedRevision` on GUI
moves and time-in-stage are net-new GUI-153 scope, not preservation work here.

### F9 — Archived has to keep its own surface

`ArchivedList.tsx` is the only place the GUI permanently deletes (two-click
confirm) and the only place it restores. `App.tsx:1565-1580` wires
`onRestore`/`onDelete`. The `archived` scope therefore renders `ArchivedList`,
not a board of columns — the scope replaces the *tab*, not the component.

### F10 — There is a stylesheet rule-presence test

`lib/stylesCheckRule.test.ts` reads `styles.css` as text and asserts a list of
selectors is present and another list stays removed. New sidebar/pager rules are
additive and collide with neither list, but the file must keep
`.card.drop-before::before`, `.card.drop-after::after` and
`.chip.dispatch-state.timed-out`.

## What this implies for the ticket

1. Two new pure modules (`lib/scopes.ts`, `lib/paging.ts`) with their own tests;
   no change to `views.ts`'s contract.
2. `Board.tsx` gains `scope` and page state; its drop maths is untouched.
3. `App.tsx` gains one `scope` state, routed into the existing `allViewItems` /
   `viewItems` chain, plus per-tab persistence alongside `view`/`filters`.
4. `settings.ts` + `shared/ipc.ts` + `preload/index.ts` + `main/index.ts` gain
   one preference pair following `setPreferences` exactly.
5. No new dependency, no core/MCP/gate change, nothing under `scripts/**`,
   `.github/**`, `plugins/**` or `packages/**`.

## Sources

Repository at `c088be13` (`main`). Files cited by path and line above. Approved
reference and implementation contract under `Kanmer_Upgrade_Pack_2026-09-05/`.
Board facts from live `get_status` (373 done, 16 backlog, 3 preparing, 30
archived, 392 items) — used only to size the manual pass, never as fixture data.
