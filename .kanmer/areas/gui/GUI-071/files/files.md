# Files — GUI-071

Paths are repo-relative to `C:\Users\PC\Documents\GitHub\kanmer`.
Renderer paths abbreviated from `apps/gui/src/renderer/src/`.

## Files the change touches

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | The nav count JSX (`:1067-1073`) stops inlining a board-wide filter and reads a per-view count instead. `allViewItems` (`:956-962`) becomes a call into the extracted predicate. The `BacklogTable` item filter (`:1186`) and the `FilterBar` items prop (`:1152`) collapse into the same source. | **High.** 1700-line component; the nav block is the exact region GUI-070 rewrites. Every consumer of `allViewItems`/`viewItems` shifts meaning at once — including two empty-state branches at `:1241-1263` that currently rely on `allViewItems` being board-wide. |
| `apps/gui/src/renderer/src/lib/board.ts` *(or a new `lib/views.ts`)* | Gains the pure view predicate — `viewItemsFor(view, items)` and a count derived from it. `board.ts` already holds the shared, testable board rules (`blockedIds`, `columnCards`, `positionForDrop`). | **Low.** Additive. Must stay `import type`-only from `@kanmer/core` (AGENTS.md §7 — the renderer is a browser context and core pulls Node-only deps). If the `View` union moves here from `App.tsx:49`, that is a second file's export surface changing. |
| `apps/gui/src/renderer/src/lib/board.test.ts` *(or a new sibling test)* | New assertions: each view's count equals the length of that view's item set; Backlog counts only `status === "backlog"`; Archived counts archived **items** including non-tickets; the Board count matches whatever meaning Q1 settles. | **Low**, and it is the ticket's whole verification bullet. Only reachable because the rule is extracted — see risk note below on component tests. |
| `docs/functional/frd/FRD-019-gui-shell.md` | R5 gains one sentence per view stating what its tab count means (and that Standup has none). Currently R5 lists the views and is silent on counts. | **Low** but **required**: the ticket says the undocumented meaning is why "111" survived. A fix that does not write the meaning down re-arms the bug. |

### Not touched, deliberately

| Path | Why not |
|---|---|
| `components/Board.tsx` | Its per-column counts (`:145-150`) are already derived from the items it renders. GUI-069 owns this file. Touching it here creates a conflict for no gain. |
| `components/BacklogTable.tsx`, `lib/windowedRows.ts` | GUI-070 decides their fate. This ticket only changes *which items are handed in*, not the component. |
| `components/ArchivedList.tsx`, `components/Standup.tsx` | Standup has no count by design (`v !== "standup"`); Archived's contents already match its count. |
| `lib/standup.ts:88` | Holds a fifth copy of a similar predicate (`!archived && type === "ticket"`), but it defines "active for the standup report", a different question with its own tests. Unifying it is scope creep; note it, leave it. |

## Ripple effects

- **Empty states (`App.tsx:1241-1263`).** They branch on `allViewItems.length`
  and `viewItems.length`. Once `allViewItems` becomes genuinely per-view, the
  Backlog view gains an empty state it never showed (today a zero-backlog board
  shows nothing, because `allViewItems` counts the whole board). The copy at
  `:1244-1246` only has strings for `ticket` and "Nothing archived." — a
  per-view empty message is now needed, or the branch mis-labels. **Check this
  explicitly; it is the most likely regression.**
- **`FilterBar` facets (`App.tsx:1152`).** It is fed `items.filter(ticket &&
  !archived)` to build its area/assignee/label/group option lists. If it is
  switched to the Board view's (possibly narrower) set, facet options shrink —
  a filter for an area that only has Done tickets would vanish from the
  dropdown. Decide deliberately whether FilterBar keeps the wide set.
- **Filters vs counts.** Board's column counts respond to search/filters; tab
  counts do not (Q2). Whatever is chosen, both behaviours are now visible side
  by side in the same header area.
- **Ctrl+1..9 view shortcuts (`App.tsx:929-939`).** Derived from
  `Object.keys(VIEW_LABELS)`. Unaffected unless the view list itself is moved
  out of `App.tsx` — if `View`/`VIEW_LABELS` move into `lib/`, this derivation
  must move or import with them.
- **Live updates.** Counts recompute from `items` on every board refresh
  (`refresh()` / watcher), so the "counts update live" verification bullet
  needs no new plumbing — but if the count moves inside a `useMemo`, its
  dependency array must include `items` **and** nothing that would stale it.
- **Tests/build.** `pnpm --filter @kanmer/gui test` (vitest) and `typecheck`
  (`tsc -p tsconfig.web.json`). No new deps required by the recommended shape.
- **Docs.** FRD-019 R5 as above. FRD-011 belongs to GUI-069/GUI-070, not here.

## Context files — read these before writing code

| Path | What it tells you |
|---|---|
| `apps/gui/src/renderer/src/App.tsx:49-56` | `View` union and `VIEW_LABELS`. The nav, the Ctrl+N shortcuts and the count all derive from this one object — the trap GUI-070's comment at `:929-933` warns about ("a parallel array went stale the moment the Backlog view was added"). Any new per-view map must be keyed off it, not a second literal. |
| `apps/gui/src/renderer/src/App.tsx:956-967` | `allViewItems` → `applyFilters` → `viewItems`. The two-stage shape (unfiltered view set, then filtered) is what the empty states depend on. Preserve both stages; the count almost certainly belongs on stage one. |
| `apps/gui/src/renderer/src/App.tsx:1184-1212` | The `BacklogTable` branch — proof that the Backlog view's real predicate is `status === "backlog"` applied *after* filtering, not in `allViewItems`. This is the mismatch the fix has to close. |
| `apps/gui/src/renderer/src/components/Board.tsx:115-150` | `mergeColumns` + the per-column counts. Shows the counting style already used, and is GUI-069's file — read it to know what will change under you. |
| `apps/gui/src/renderer/src/lib/board.ts` | The pattern to follow: pure functions, `import type` only from core, heavy comments explaining *why*, sibling `.test.ts`. |
| `apps/gui/src/shared/stages.ts` | `UI_STAGES`, `UI_STAGE_IDS`, `UI_LAST_STAGE`. If the Board count excludes Done, it must be expressed as `UI_LAST_STAGE`, never the literal `"done"`. `stages.test.ts` keeps this copy honest against core. |
| `AGENTS.md` §7 | The renderer's `import type`-only rule for `@kanmer/core`, and the strict-TS conventions. |
| `docs/functional/frd/FRD-019-gui-shell.md` R5 | The governing doc for this ticket, and the place the count's meaning gets written. |

## Out of scope

- Whether Done should be hidden/collapsed on the board (a different fix; the
  count question is not a licence to change what the Board view renders).
- Adding jsdom + `@testing-library/react` to `apps/gui` so JSX can be tested
  directly. The app has **no** component tests today and no test environment
  configured; introducing one is its own ticket. This fix earns its test by
  extracting the rule instead.
- Unifying `lib/standup.ts:88`'s "active" predicate with the view predicate.
- The Backlog view's existence (GUI-070) and the Backlog column's position
  (GUI-069).

## File overlap with GUI-069 / GUI-070 — for sequencing

| File | GUI-069 | GUI-070 | GUI-071 |
|---|:--:|:--:|:--:|
| `renderer/src/App.tsx` — `View`/`VIEW_LABELS` `:49-56` | — | **edits** | reads (may import) |
| `renderer/src/App.tsx` — `allViewItems` `:956-962` | — | possibly | **edits** |
| `renderer/src/App.tsx` — nav + counts `:1059-1076` | — | **edits** | **edits** |
| `renderer/src/App.tsx` — Backlog branch `:1184-1212` | — | **deletes** | **edits** (item source) |
| `renderer/src/components/Board.tsx` | **edits** | — | — |
| `renderer/src/components/BacklogTable.tsx`, `lib/windowedRows.ts` | — | **decides/deletes** | — |
| `renderer/src/lib/board.ts` (+ test) | — | — | **edits** |
| `docs/.../FRD-011` | **edits** | **edits** | — |
| `docs/.../FRD-019` | — | possibly (view list) | **edits** |

**Conclusion:** GUI-069 is file-disjoint from both and can run in parallel with
either. GUI-070 and GUI-071 collide in the same JSX region of `App.tsx` and
must be sequenced — **GUI-069 → GUI-070 → GUI-071** is the order that avoids
writing a `backlog` branch only to delete it, and lets GUI-071 write the final
view list into FRD-019 once.
