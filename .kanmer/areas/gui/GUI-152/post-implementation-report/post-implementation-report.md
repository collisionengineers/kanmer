# Post-implementation report — GUI-152: Focus Board (UI-A + UI-B)

Branch `GUI-152-focus-board-scopes`, worktree `.worktrees/GUI-152`, cut from
`main` at `c088be13`. Two commits, one per slice.

## Delta

### UI-A — `39573b4a` "Add Focus Board scope and paging selectors with per-project view preferences"

| File | Change |
|---|---|
| `docs/functional/frd/FRD-036-focus-board.md` | **New.** The governing doc: five scopes, the fixed pipeline, the four-card bound, the rail, preferences, and the R1–R9 acceptance list this report ticks. Names UI-C/UI-D as GUI-153. |
| `apps/gui/src/renderer/src/lib/scopes.ts` | **New.** `Scope`, `SCOPES`, `SCOPE_IDS`, `DEFAULT_SCOPE`, `isScope`, `scopeLabel`, `scopeDescription`, `stagesForScope`, `scopeItems`, `scopeCounts`, `primaryGroup`. |
| `apps/gui/src/renderer/src/lib/scopes.test.ts` | **New.** 22 tests. |
| `apps/gui/src/renderer/src/lib/paging.ts` | **New.** `PAGE_SIZE = 4`, `pageCount`, `clampPage`, `pageColumn`, `clampPages`, `pageOf`. |
| `apps/gui/src/renderer/src/lib/paging.test.ts` | **New.** 27 tests, including the 2,000-ticket board. |
| `apps/gui/src/main/settings.ts` | `ViewPrefs`, `DEFAULT_VIEW_PREFS`, `viewPrefs` on `AppSettings`, `normalizeViewPrefs(Map)` in `readSettings`, `readViewPrefs`, `setViewPrefs` under `withSettingsFileLock`. |
| `apps/gui/src/main/settings.test.ts` | +6 tests (defaults, round-trip, per-project keying, junk pages dropped, hand-edited file survives, nothing written outside `settings.json`). |
| `apps/gui/src/shared/ipc.ts` | `CH.getViewPrefs`/`CH.setViewPrefs`, the `ViewPrefs` type, two `KanmerApi` methods. |
| `apps/gui/src/preload/index.ts` | Two forwarders. |
| `apps/gui/src/preload/index.test.ts` | +2 tests proving the boundary carries only `projectId` and the value. |
| `apps/gui/src/main/index.ts` | `viewPrefsKey()` — `store.getProject()?.project_id ?? projectId` — and two `ipcMain.handle`s. |

Three design points worth the reviewer's attention:

1. **`lib/views.ts` is not edited.** A scope is a second axis inside the Board
   view. Adding the five scopes to `VIEWS` would have put all five in the tab
   strip and in Ctrl+1…9 *by construction*, because that record is precisely
   what keys a view's label, item set, badge and shortcut together (GUI-071).
   `views.test.ts` passes unedited.
2. **Preferences are keyed by logical `project_id`, resolved in main.** The IPC
   boundary still takes the same `projectId` root path every other
   project-scoped method takes; `viewPrefsKey` resolves it through the same
   `store.getProject()` reader `registrySelectedIdentity` already uses. No path
   or identity field was added to the boundary (AGENTS.md §8 gotchas 15, 16).
   A board with no `.kanmer/project.json` falls back to the root path.
3. **Main does not know the scope vocabulary.** `normalizeViewPrefs` stores a
   plausible string and the renderer re-validates with `isScope`. One list per
   concept.

### UI-B — `8ef01486` "Render the Focus Board rail, bounded columns and compact cards"

| File | Change |
|---|---|
| `apps/gui/src/renderer/src/components/Sidebar.tsx` | **New.** Workspace / Areas / Standup. |
| `apps/gui/src/renderer/src/components/Sidebar.test.tsx` | **New.** 15 tests. |
| `apps/gui/src/renderer/src/components/Board.tsx` | Scoped columns, per-column pager, compact cards, paged-drop refusal. |
| `apps/gui/src/renderer/src/components/Board.test.tsx` | 1 test → 22. The original empty-column drop-anchor test is preserved verbatim in behaviour. |
| `apps/gui/src/renderer/src/App.tsx` | `scope`, `columnPages`, `sidebarCollapsed`; `activeView`; `selectView`/`selectScope`/`revealItem`; rail render; preference load/save; truthful empty states. |
| `apps/gui/src/renderer/src/styles.css` | `.board-column`, `.col-dot`, `.col-pager`, `.col-range`, `.col-refused`, `.card-context`, `.chip.more`, the whole `.sidebar` family, the ≤900px rule and a global `prefers-reduced-motion` rule. |

Three design points:

1. **Paging changes what is rendered and nothing else.** `onCardDrop` still
   computes from `columnCards(itemsRef.current, statusId)` — the whole sorted
   column — so a drop at the top of page 3 resolves to "after the last card of
   page 2", not "top of the column". `Board.test.tsx` asserts exactly that.
2. **The refusal is narrow and reasoned.** The only drop paging genuinely
   breaks is the whole-cell fallback, which means "bottom of the column": from
   page 1 of 7 that is a position the user cannot see, so the card would vanish
   with no indication of where it went. It is refused with a visible
   `role="status"` reason naming the last page and the right-click menu, and the
   same text is announced through App's existing live region. On the last page
   the drop behaves exactly as before. Card-to-card drops are never refused.
3. **`activeView` is derived, not stored.** `view === "standup" ? "standup" :
   scope === "archived" ? "archived" : "ticket"`. The Archived tab and the
   Archived scope are two controls over one piece of state, so the tab strip,
   the rail, the badges and the empty states cannot disagree. Ctrl+1…3 and the
   palette's "Go to …" commands route through the same `selectView`.

## Parity checklist

Every item exercised in code and, where marked ✔ (live), against the live board
in a jsdom render of the real 422-item board.

| Operation | Still reachable | How |
|---|---|---|
| Detail editor (open, edit, save, doc tabs, conflict banner) | ✔ | `Editor` render path unchanged; `trySelect`/`openEditor` untouched; `Editor.test.tsx` 19 tests green unedited |
| Card click → select | ✔ | `Card.onClick` unchanged |
| Card right-click → context menu (Open · Move to ▸ · Add to group ▸ · Dispatch ▸ · Copy · Archive) | ✔ | `onContext` unchanged; `ContextMenu.test.tsx` green unedited. This is also the unbounded move route the paged-drop refusal points at |
| Drag/drop stage move | ✔ | `onCardDrop` → `positionForDrop(columnCards(...))`, unchanged |
| Drag/drop manual reorder | ✔ | Full-column neighbours asserted by a new test |
| Ctrl+Arrow stage move | ✔ | `onMoveRelative` unchanged; asserted in `Board.test.tsx` |
| Gate lock-tint during drag | ✔ | `getGateStatus` → `.cell.gated` unchanged |
| Quick add (column and per-area) | ✔ | `QuickAdd` call sites unchanged |
| FilterBar (search, area, assignee, label, group, clear) | ✔ | Props unchanged; rendered for `activeView === "ticket"` |
| Group chip → filter to group | ✔ | Now the single primary chip; `onFilterGroup` unchanged, asserted |
| Command palette (Ctrl+K, jump, verbs) | ✔ | `onJump` now `revealItem`, which is strictly more capable |
| Search reaches every scope | ✔ | The palette searches `items` (the whole board) and `revealItem` switches scope and page |
| Standup | ✔ (live) | Reachable from the tab strip **and** the rail; `onSelect` → `revealItem` |
| Activity panel | ✔ | `onSelect` → `revealItem` |
| Dispatches panel | ✔ | Row link → `revealItem` |
| Toast reveal / `onReveal` from main | ✔ | Both → `revealItem` (via a ref, to avoid a TDZ read) |
| Archived: restore | ✔ (live) | `ArchivedList` unchanged, rendered by the `archived` scope |
| Archived: permanent delete (two-click confirm) | ✔ | Same |
| Retired non-PASS records shown as history | ✔ (live) | All 30 archived records are non-Done; each keeps its real stage label and none appears in a live scope |
| Multi-project tabs (open, close, switch, unread, dirty guard) | ✔ | `TabStrip` unchanged; scope added to the per-tab snapshot |
| Session restore | ✔ | `setOpenTabs` unchanged |
| Settings — Board, Profiles, Appearance, Git, Connect, Dispatch, Remote access, OpenAI tunnel, Projects | ✔ | `Settings` untouched; its four test files green unedited |
| Migration banner, staleness banner, board-worktree banner, update banner | ✔ | Untouched |
| Welcome / empty-project screen | ✔ | Untouched |
| In-app manual (F1) | ✔ | Untouched; `check:manual` clean |
| Ctrl+1…3, Ctrl+F, Ctrl+N, Ctrl+K, Ctrl+, , Ctrl+Tab | ✔ | All routed through `selectView`, otherwise unchanged |
| Tab badges ignore filters; column counts do not | ✔ | `viewCounts(items)` unchanged; column head shows the filtered total; the pager shows the shown range |

## Commands and exit codes

Run from `.worktrees/GUI-152`.

| Command | Exit |
|---|---|
| `npm ci` | 0 |
| `npm run build` (core + server) | 0 |
| `npm run test -w @kanmer/gui` | **0** — 57 files, **646 tests**, all green (was 601 before this ticket) |
| `npm run typecheck -w @kanmer/gui` | 0 |
| `npm run typecheck` (all workspaces) | 0 |
| `npm run build -w @kanmer/gui` | 0 |
| `npm run verify:docs` | 0 — `PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current` |
| `npm run check:manual` | 0 — `manual: up to date (22 chapters)` |
| `npm run dev:gui` | started clean (main, preload and renderer bundles built; Electron launched) |

The full `npm run verify` rail was **not** run — HZN-009's operating controls
reserve it for CI and for the release cut.

## Manual / live-board qualification

`npm run dev:gui` starts the app, but this lane has no way to drive an Electron
window interactively, so the live pass was done as a throw-away jsdom render of
the **real** board (`.worktrees/kanmer`, 422 records) through the real
components, then deleted. It is reproducible from the numbers below.

```
TOTAL 422   ARCHIVED 30
BY STAGE (live) {"done":373,"backlog":15,"preparing":1,"review":2,"implementing":1}
RAIL COUNTS     {"active":4,"all":392,"backlog":15,"done":373,"archived":30}

ACTIVE COLUMNS: Preparing column | Implementing column | Review column | Verifying column
SCOPE active:  preparing=1  implementing=1  review=2  verifying=0
SCOPE all:     backlog=15 (4 pages)  …  done=373 (94 pages)
SCOPE backlog: backlog=15 (4 pages)
SCOPE done:    done=373 (94 pages)

DONE page 1:   "1–4 of 373"     -> 4 cards
DONE page 47:  "185–188 of 373" -> 4 cards
DONE page 94:  "373–373 of 373" -> 1 card
DONE page 999: "373–373 of 373" -> 1 card      (clamped, never an empty page)
DONE reachable across all 94 pages: 373 of 373

EMPTY FILTERED SCOPE: 4 columns, every count blank, no pager rendered
ARCHIVED not-done (retired): 30 — CORE-099@verifying, GUI-015@review,
                             MCP-028@verifying, CORE-021@backlog, CORE-028@backlog, …
RAIL: kanmer | Workspace: Active work 4 · All tickets 392 · Backlog 15 ·
      Completed 373 · Archived 30 | Areas: All areas, Core, MCP Server, GUI,
      Skills, Docs, No area | Standup
RAIL CONTROLS focusable: 14 of 14 (every one a real <button>)
```

Those counts agree with `get_status.counts` read at the same moment (`done` 373,
`archived` 30; the in-flight stages differ from the ticket's opening snapshot
because sibling lanes are working the board — `active` is 4, not 3, because this
ticket is itself in Implementing).

**Not covered by this pass, and named honestly:** pixel comparison against the
desktop/laptop/mobile previews, and anything that needs a real pointer (a live
drag, hover states, actual `prefers-reduced-motion` and the ≤900px media query).
Those are UI-D / GUI-153 and are what the reviewer should exercise by hand.

## Deviations

1. **`docs_todo` stays `true`.** `FRD-036` exists only on this branch, and
   `update_item` resolves `refs` against the repo root — which is `main`. The
   refusal is quoted verbatim in `scratch/notes.md`. The `leave-backlog` gate
   accepts `docs_todo`. **Whoever merges should then set**
   `refs: [FRD-019, FRD-011, FRD-036]` and `docs_todo: false`.
2. **Card DOM order follows the approved reference, not a literal reading of
   "title first".** The reference (`prototype.js` `card()`) puts a small id line
   above an `<h3>` heading; the title is first *in visual hierarchy*, the id is
   small and muted above it. I kept the reference's order so exception badges
   (blocked / taken / agent / deployment / PRs) stay on the id line where the
   design puts them. If the reviewer reads the brief as requiring the title to
   be the first DOM node, that is a one-line reorder of `card-top` and
   `card-title`.
3. **Labels were kept on the card.** The reference's card shows no labels. I
   judged removing them a data cull rather than a density change — they are a
   filterable attribute the user chose to set — so they render quietly below the
   context line. Easy to drop if the reviewer disagrees.
4. **The refusal is narrower than "refuse a cross-page drop".** Card-to-card
   drops across pages are *correct* (the neighbour comes from the full column),
   so refusing them would remove working behaviour. Only the whole-cell
   "bottom of the column" drop is refused, and only while the last page is off
   screen. Reasoned in `Board.tsx`'s docblock and covered by two tests.
5. **`selectScope` clears remembered pages.** A different scope renders a
   different set of columns, so a page stored against the old ones addresses
   nothing. Clearing is honest; clamping would keep a number that means
   something else.
6. **Two pre-existing test files gained `afterEach(cleanup)`.** Vitest globals
   are off in this workspace, so RTL's auto-cleanup never runs and repeated
   renders stack into one document. This is a test-harness fix, not a relaxed
   assertion.
7. **`prefers-reduced-motion` is honoured globally**, not per component, so a
   transition added later cannot quietly opt out.

## What the reviewer should exercise by hand

1. Open the app on the live board. Confirm the default is **Active work** with
   four columns and that the rail's counts match `get_status`.
2. Switch to **Completed** and page through Done with the buttons and with
   Tab+Enter only. Confirm the range label tracks and that the last page is
   `373–373 of 373`.
3. Type into the search box while on Completed. Confirm the column count drops,
   the rail's 373 does **not**, and an empty result says the *filter* matched
   nothing.
4. Ctrl+K, type a Done ticket's id while sitting on Active work. Confirm the
   board switches scope and pages to the card, and the Editor opens on it.
5. Drag a card onto another card two pages down (after paging there) and confirm
   the order lands where the insertion line showed it. Then drag onto empty
   column space from page 1 of Done and confirm the refusal message.
6. Switch to **Archived**, restore one record and confirm "Delete permanently"
   still asks twice.
7. Collapse the rail, restart the app, and confirm the scope, the collapse and
   the page came back. Then confirm `%APPDATA%\Kanmer\settings.json` carries
   them under `viewPrefs` keyed by a uuid, and that no ticket file changed.
8. Narrow the window below 900px and confirm the rail collapses to icons and is
   still operable.
9. Open Settings and confirm all nine sections are still there.

## Stop condition

Draft PR opened against `main`, marked ready, ticket in **Review** with its `prs`
recorded. Not reviewed by me, not merged, GUI-153 not started.
