# Plan — GUI-152: Focus Board — scopes, bounded columns and sidebar (UI-A + UI-B)

## Objective

The board's default view becomes Active work: four stage columns, four visible
cards per column with a pager, a navigation rail with live scope and area
counts, and view preferences remembered per logical project — with every
existing operation still reachable and unchanged in semantics.

## Starting state

`main` at `c088be13`. Worktree `.worktrees/GUI-152`, branch
`GUI-152-focus-board-scopes`, `npm ci` + `npm run build` (core + server) done so
the GUI can import core's dist types.

Verified behaviour is recorded in `research/research.md` F1–F10:
`lib/views.ts` owns the three top-level views and is filter-blind by signature;
`App.tsx:1265-1269` already reduces `items → viewItemsFor → applyFilters`;
`Board.tsx` builds all six columns unconditionally through `mergeColumns` and
sorts each with `columnCards`; drag/drop maths is column-scoped and must stay
so; `Card` is memoised on primitives; `settings.ts` writes under one file lock
and `setPreferences` is the pattern to copy; `store.getProject()` is main's
existing reader for the logical `project_id`.

Evidence: `research/research.md`@`bd5fef06a9a86ad8`, `files/files.md`@`ff91618147959428`.

## Governing docs

- **FRD-036 (new, this ticket) — Meets.** Authored at
  `docs/functional/frd/FRD-036-focus-board.md` before the code. R1–R9 there are
  this plan's acceptance list. It exists only on this branch, so `refs` cannot
  cite it yet (`update_item` resolves `refs` against the repo root, which is
  `main`); `docs_todo` stays `true` and `scratch/notes.md` records why.
- **FRD-019 (GUI shell) — Meets, refines.** R5's three views survive unchanged;
  R5a/R5b/R5c (badge ignores filters, column counts do not, one source in
  `views.ts`) are preserved by construction — `views.ts` is not edited and scope
  lives in a new module. The Archived *view* gains a scope equivalent; the tab
  strip is not removed.
- **FRD-011 (backlog list view, withdrawn) — Meets by not reviving it.** The
  `backlog` scope renders the Backlog **column**, not a second list surface.
- **FRD-031 (delivery state) — Meets.** "Completed" names the Done stage only;
  no `delivery_*` field is read, and nothing here can reach a gate.
- **No new ADR.** Every decision here is a presentation decision already fixed
  by the approved reference and its implementation contract.

## Required changes

**UI-A — pure selectors and persistence**

1. `lib/scopes.ts` — `type Scope = "active" | "all" | "backlog" | "done" | "archived"`;
   `SCOPES` (ordered, with labels); `stagesForScope(scope, board?)`:
   `active` → `["preparing","implementing","review","verifying"]`, `all` → all
   six in `UI_STAGE_IDS` order, `backlog` → `["backlog"]`, `done` → `["done"]`,
   `archived` → `[]` (the archived scope renders a list, not columns);
   `scopeItems(items, scope)` — `archived` returns only `i.archived`; every other
   scope drops archived first, then filters by `stagesForScope` membership
   (`all` keeps every non-archived ticket, including a status with no stage);
   `scopeCounts(items)` → `Record<Scope, number>` in one pass.
2. `lib/paging.ts` — `PAGE_SIZE = 4`;
   `clampPage(page, total, size)` → 1-based page clamped to
   `[1, max(1, ceil(total/size))]`;
   `pageColumn(cards, page, size = PAGE_SIZE)` →
   `{ cards, start, end, total, page, pageCount }` with `start`/`end` 1-based
   for display and `start === 0` only when `total === 0`. A module docblock
   states the fixed pipeline order: project → scope → filters/search →
   deterministic sort (`order` then id) → page.
3. `main/settings.ts` — `export interface ViewPrefs { scope: string; sidebarCollapsed: boolean; columnPages?: Record<string, number> }`;
   `viewPrefs?: Record<string, ViewPrefs>` on `AppSettings`; a
   `normalizeViewPrefs` in `readSettings` that drops anything malformed (unknown
   scope → default, non-integer/`< 1` page → dropped) so a hand-edited file
   cannot crash the renderer; `setViewPrefs(projectId, prefs)` and
   `readViewPrefs(projectId)` under `withSettingsFileLock`, merging rather than
   replacing the map.
4. `shared/ipc.ts` — `CH.getViewPrefs` / `CH.setViewPrefs`, the `ViewPrefs` type
   re-exported for the renderer, and two `KanmerApi` methods taking the same
   `projectId` every other project-scoped method takes.
5. `preload/index.ts` — two `ipcRenderer.invoke` forwarders.
6. `main/index.ts` — two handlers. Each resolves the logical key with
   `(await requireCtx(projectId).store.getProject())?.project_id ?? projectId`
   so a board without `.kanmer/project.json` still gets stable-per-root storage,
   and no new path field crosses the IPC boundary.

**UI-B — presentation, wired**

7. `components/Sidebar.tsx` — `<nav aria-label="Board navigation">` holding two
   `<ul>`s: **Workspace** (the five scopes, each a `<button>` with a label and a
   count from `scopeCounts`, `aria-current="page"` on the active one) and
   **Areas** (All areas + one per `board.areas`, human name, colour dot, setting
   `filters.area`), plus a Standup button. A collapse toggle with
   `aria-expanded`; collapsed renders icons/initials only and keeps accessible
   names.
8. `components/Board.tsx` — new props `scope`, `pages`, `onPageChange`.
   `rendered = stagesForScope(scope)` feeds `mergeColumns`' first argument while
   `UI_STAGE_IDS` stays its third (`known`), so a scoped-out stage cannot come
   back as a fallback column. Each column: `columnCards(items, id)` →
   `pageColumn(cards, pages[id] ?? 1)`; the head shows the **filtered total**;
   the footer pager shows `start–end of total` with prev/next, and is not
   rendered at `total <= PAGE_SIZE`. Cards render compactly: title first, small
   id, area context line, one group chip (the first group that is not the
   ticket's own area/horizon duplicate — see step 9) plus `+N`. Drag/drop,
   Ctrl+Arrow, quick add, gate tint and the context menu are untouched;
   `onCardDrop` keeps using `columnCards(itemsRef.current, statusId)`.
9. **Most relevant group** — `primaryGroup(groups)` in `lib/scopes.ts`: the
   first group id in the ticket's own order, with `extraGroups = groups.length - 1`.
   No re-ordering heuristic is invented and no membership is dropped; the full
   list stays in the Editor. Passed to the memoised `Card` as
   `groupChip: string | null` + `groupExtra: number` (primitives, per F5).
10. `App.tsx` — `const [scope, setScope] = useState<Scope>("active")` and
    `columnPages: Record<string, number>`; `allViewItems` becomes
    `scopeItems(viewItemsFor("ticket", items), scope)` for the board and keeps
    its existing shape for standup; `view === "archived"` is replaced by
    `scope === "archived"`, which renders the existing `ArchivedList` with its
    restore/delete callbacks intact. Counts: rail = `scopeCounts(items)`
    (unfiltered), column head = filtered total, pager = shown range. Selecting a
    search/palette result calls a new `revealItem(id)` that switches scope to one
    containing the item and sets that column's page to the one holding it before
    selecting. Prefs are loaded on project open and saved (debounced) on change.
11. `styles.css` — `.app-shell` grid for rail + content, `.sidebar`,
    `.nav-item`, `.nav-caption`, `.col-pager`, compact `.card` rules, all from
    the existing tokens; `@media (prefers-reduced-motion: reduce)` disables
    transitions; `@media (max-width: 900px)` collapses the rail.

> No `investigate`/`decide`/`choose` remains: the scope table, the page size,
> the chip rule and the preference key are all fixed above.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `docs/functional/frd/FRD-036-focus-board.md` | Governing doc |
| Add | `apps/gui/src/renderer/src/lib/scopes.ts` | Scope selectors |
| Add | `apps/gui/src/renderer/src/lib/scopes.test.ts` | Scope tests |
| Add | `apps/gui/src/renderer/src/lib/paging.ts` | Column paging |
| Add | `apps/gui/src/renderer/src/lib/paging.test.ts` | Paging tests |
| Add | `apps/gui/src/renderer/src/components/Sidebar.tsx` | The rail |
| Add | `apps/gui/src/renderer/src/components/Sidebar.test.tsx` | Rail tests |
| Modify | `apps/gui/src/renderer/src/components/Board.tsx` | Scoped columns, pager, compact cards |
| Modify | `apps/gui/src/renderer/src/components/Board.test.tsx` | Pager, counts, no false empty |
| Modify | `apps/gui/src/renderer/src/App.tsx` | Scope routing, counts, reveal, prefs |
| Modify | `apps/gui/src/renderer/src/styles.css` | Rail, pager, compact card |
| Modify | `apps/gui/src/main/settings.ts` | `viewPrefs` |
| Modify | `apps/gui/src/main/settings.test.ts` | `viewPrefs` normalisation |
| Modify | `apps/gui/src/main/index.ts` | Two IPC handlers |
| Modify | `apps/gui/src/shared/ipc.ts` | Channels, type, API |
| Modify | `apps/gui/src/preload/index.ts` | Two forwarders |
| Modify | `apps/gui/src/preload/index.test.ts` | API coverage, if enumerated |
| Modify | `docs/contributing/doc-structure.md` | Only if `verify:docs` reports it stale |

## Do not modify

`packages/**`, `plugins/**`, `scripts/**`, `.github/**`,
`Kanmer_Upgrade_Pack_2026-09-05/**`, `apps/gui/src/renderer/src/lib/views.ts`,
`apps/gui/src/renderer/src/lib/board.ts`,
`apps/gui/src/renderer/src/components/ArchivedList.tsx`,
`apps/gui/src/renderer/src/components/Editor.tsx`,
`apps/gui/src/renderer/src/components/Settings.tsx`,
`apps/gui/package.json`, `package.json`, `package-lock.json`.

## Constraints

- No new dependency (Agent conduct 10; the ticket says so explicitly).
- Renderer may only `import type` from `@kanmer/core` (AGENTS.md §7); stage data
  comes from `shared/stages.ts`.
- `Card` stays memoised on primitives (§8 gotcha 9).
- Drop neighbours come from the full sorted column, never the page or an area
  group (§8 gotcha 9).
- Preferences are keyed by logical `project_id` and never written to a ticket or
  read by a gate.
- The three counts (scope total, filtered total, shown range) stay distinct
  (FRD-019 R5a/R5b).
- Scoped checks only — never the full `npm run verify` (HZN-009 operating
  controls).

## Ordered steps

1. Write `docs/functional/frd/FRD-036-focus-board.md`; attempt `link_doc`, and
   on refusal keep `docs_todo` with the reason in scratch. *(done)*
2. `lib/scopes.ts` + `lib/scopes.test.ts` — red then green.
3. `lib/paging.ts` + `lib/paging.test.ts`, including the 2,000-item board and
   the filter-before-page and no-false-empty cases.
4. `main/settings.ts` `viewPrefs` + normalisation + `settings.test.ts`.
5. `shared/ipc.ts` → `preload/index.ts` → `main/index.ts`: channels, types,
   forwarders, handlers, logical-key resolution.
6. `components/Sidebar.tsx` + `Sidebar.test.tsx`.
7. `components/Board.tsx`: scoped columns, per-column pager, compact card;
   extend `Board.test.tsx`.
8. `App.tsx`: scope state, routing, archived scope, counts, `revealItem`,
   preference load/save, per-tab state.
9. `styles.css`: rail, pager, compact card, reduced motion, narrow window.
10. Scoped checks, then the manual pass against the live board and the previews.
11. Post-implementation report, commits, draft PR, `update_item prs`,
    `move_item → review`, `gh pr ready`.

## Acceptance checks

- **Production caller named:** `Sidebar` is rendered by `App.tsx`;
  `scopes.ts`/`paging.ts` are called by `App.tsx` and `Board.tsx`;
  `getViewPrefs`/`setViewPrefs` are invoked by `App.tsx` on project open and on
  scope/page/collapse change. Nothing is registered-but-unreachable.
- Tests assert the FRD's R1–R8 without weakening any existing assertion; every
  currently-green GUI test stays green unedited except `Board.test.tsx`, whose
  edit is an extension plus the column-index fix that scoping forces.
- No schema, migration or permission surface is touched.

## Commands

From `.worktrees/GUI-152`:

```
npm run test -w @kanmer/gui
npm run typecheck -w @kanmer/gui
npm run build -w @kanmer/gui
npm run verify:docs
npm run check:manual
npm run typecheck          # once, at the end, all workspaces
npm run dev:gui            # manual pass against the live board root
```

## Failure and deviation rules

Stop and report on: a failing check I cannot fix inside this scope; a need to
touch a `Do not modify` path; any temptation to add a dependency; a conflict
between the approved reference and an existing FRD; a parity item that cannot be
preserved. Deviations are recorded in the post-implementation report, never
silently redesigned.

## Stop condition

A draft PR opened against `main`, marked ready, with the ticket in **Review**
and its `prs` recorded. I do not review, do not merge, and do not start GUI-153.
