---
status: approved
covers: Focus Board — scopes, bounded columns and the navigation rail (GUI-152 UI-A + UI-B)
---

# FRD-036 — Focus Board

The board's navigation and rendering model: what a scope is, how a column is
bounded, and the fixed order in which items are reduced from "the project" to
"the four cards you can see".

**Approved reference:** `Kanmer_Upgrade_Pack_2026-09-05/approved-ui/01-focus-board.html`
with `approved-ui/source/prototype.js` (`CONCEPT === 1`) and the previews under
`approved-ui/previews/`. The reference is a **design authority only**: its data
is fabricated demonstration content and none of its numbers, ticket ids or
states are evidence about this or any board. The implementation contract that
accompanies it is `Kanmer_Upgrade_Pack_2026-09-05/09_FOCUS_BOARD_IMPLEMENTATION.md`.

**Relationship to existing FRDs.** This document supersedes nothing. It refines
FRD-019 §R5 (Views) — the shell's three top-level views gain a *scope* dimension
inside the Board view, and the Archived view becomes the `archived` scope — and
it does **not** revive FRD-011 (the withdrawn Backlog list view): Backlog here is
a board scope rendering the Backlog column, not a second list surface. FRD-019
§R5a/R5b/R5c continue to hold unchanged: a tab badge still ignores search and
filters, per-column counts still respond to them, and `lib/views.ts` remains the
one place a view's label, item set and badge are keyed together.

## Slicing

The Focus Board is delivered in four slices. **This FRD is the end-state spec of
UI-A and UI-B only**; UI-C and UI-D are [[GUI-153]] and are named here so the
boundary is explicit rather than implied.

| Slice | Contents | Ticket |
|---|---|---|
| UI-A | Scope and paging selectors, view-preference persistence | GUI-152 |
| UI-B | Sidebar, bounded columns, compact cards, wiring | GUI-152 |
| UI-C | Board/List toggle and table view, `expectedRevision` on GUI moves and the conflict UI, keyboard stage-move parity audit, time-in-stage | GUI-153 |
| UI-D | Packaged-renderer qualification against the desktop/laptop/mobile previews | GUI-153 |

## Behaviour

### The five scopes

A **scope** answers "which slice of the project am I looking at". It is
orthogonal to the six workflow stages, which it does not change, hide or
reinterpret; it selects which stage columns are rendered and whether archived
records are in play.

| Scope | Label | Stages rendered | Archive |
|---|---|---|---|
| `active` | Active work | preparing, implementing, review, verifying | excluded |
| `all` | All tickets | all six | excluded |
| `backlog` | Backlog | backlog | excluded |
| `done` | Completed | done | excluded |
| `archived` | Archived | — (renders the archived list) | **only** archived |

`active` is the default. "Completed" is the Done stage, named for a human; it is
not a delivery state and must not be read as "deployed" (FRD-031 keeps delivery
state separate from workflow stage).

### The pipeline

The reduction order is fixed and is the whole point of the ticket:

```
project → scope → filters/search → deterministic sort (order, then id) → page
```

Filtering after slicing is a defect by construction: a column paged before it is
filtered shows a false empty page whenever the matches live past the page
boundary. The sort is core's own rule (`order` ascending with unordered last,
ties broken by numeric-aware id comparison), so the renderer's order and the
store's order cannot drift.

### Bounded columns

A column shows **four cards** and a pager reading `start–end of total`. This is a
display bound, not a WIP limit and not a change to any stage rule: every ticket
stays reachable through paging, scopes and search. The pager is hidden when the
column holds four or fewer cards. Page state is per column and is clamped, never
trusted: when the filtered set shrinks under a page the page is reduced to the
last page that holds cards.

### Cards

Compact density taken from the reference: title first, id small above it, area
name, and **one** group chip — the most relevant membership — with a `+N`
indicator when the ticket carries more. Group membership is many-to-many and is
never edited to make a card fit; the full list stays reachable in the Editor.
Exception badges (blocked, taken, dispatching, PR count, deployment) keep their
existing meaning and are not given equal weight with ordinary metadata.

### The rail

A left sidebar with two lists and a Standup entry:

- **Workspace** — the five scopes, each with a live count of what that scope
  holds (unfiltered — it is a badge, FRD-019 R5a).
- **Areas** — "All areas" plus one entry per board area, by human name with its
  colour dot, setting the area filter.
- **Standup** — reaches the existing Standup view.

It is semantic (`<nav>` / `<ul>` / `<button>`), keyboard navigable with visible
focus, carries `aria-current="page"` on the active scope, and is collapsible.
Below roughly 900px it collapses.

### Preferences

Scope, rail-collapsed and per-column page are **view preferences**, stored in the
GUI's `settings.json` keyed by the logical `project_id` from
`.kanmer/project.json` (AGENTS.md §8 gotcha 15) — not by worktree path, and never
written to a ticket. They cannot influence a gate.

## Acceptance criteria

1. **R1 — Scope selection.** `stagesForScope` and `scopeItems` produce exactly
   the table above; a non-archived scope never returns an archived item, and the
   `archived` scope returns only archived items whatever their stage or type.
2. **R2 — Pipeline order.** `pageColumn` is applied last. Unit tests on a
   synthetic 2,000-ticket board prove: the filtered set is paged (not the paged
   set filtered); a page is clamped when the filtered set shrinks; a column whose
   matches lie outside the previously-selected page renders those matches rather
   than a false empty state.
3. **R3 — Bound is display only.** Four cards render per column with a
   `start–end of total` label and prev/next controls; the pager is absent at
   `total ≤ 4`; every ticket in a column is reachable by paging.
4. **R4 — Counts are distinguishable.** The rail's per-scope count is the
   unfiltered size of that scope; a column's count reports the filtered total;
   the visible range reports what is shown. The three are never conflated.
5. **R5 — Search reaches everything.** Search and the command palette reach every
   scope, and opening a result opens that exact item even when it sits outside
   the active scope or the visible page — switching scope and page as required.
6. **R6 — Manual order is column-wide.** A drag reorder computes its neighbours
   from the whole sorted column (`columnCards` → `positionForDrop`), never from
   the visible page or a rendered area group. A drop that cannot be expressed
   against the full column from the visible page is refused with a visible
   reason and the context-menu move remains available.
7. **R7 — Accessibility.** The rail and every pager are operable without a
   pointer, show visible focus, and the active scope carries `aria-current`.
   `prefers-reduced-motion` is respected. A narrow window collapses the rail.
8. **R8 — Preferences.** `scope`, rail-collapsed and column pages persist in
   `settings.json` under `viewPrefs[project_id]` through `getViewPrefs` /
   `setViewPrefs`; no ticket file is written and no gate input changes.
9. **R9 — Parity.** Every existing operation stays reachable and keeps its
   semantics: detail editor, filters, search, command palette, card context menu,
   quick add, standup, activity, dispatches, archived restore and permanent
   delete, drag/drop and Ctrl+Arrow stage moves, every Settings section, and
   multi-project tabs.

**Acceptance evidence:** `npm run test -w @kanmer/gui`, `npm run typecheck`,
`npm run build -w @kanmer/gui` green, with `scopes.test.ts`, `paging.test.ts`,
`Sidebar.test.tsx` and an extended `Board.test.tsx`; plus a manual pass on the
live board (Active shows four columns; Backlog/Completed/Archived counts equal
`get_status.counts`; Done pages; an empty filtered scope states truthfully that
the filter, not the board, is empty; the rail is usable from the keyboard alone).

## Edge cases

- **Empty filtered scope.** The empty state must say the filter matched nothing
  and offer to clear it — never imply the scope itself is empty.
- **A stage with no column.** `mergeColumns`' `known` argument keeps a stage that
  a scope deliberately excludes from reappearing as an unknown-status fallback
  column (GUI-069). Scoping a stage out is a decision, not a missing column.
- **Retired non-PASS records.** Archived tickets that never reached Done are
  historical, not completed: they appear only in the `archived` scope and keep
  their real stage label.
- **Large boards.** 2,000+ tickets: selectors are memoised and pure; no
  filesystem or document read happens per render.
- **Stale page after a live change.** An agent's write can shrink a column while
  it is being read; the page clamps on the next render rather than blanking.

## Non-goals

Board/List toggle and the table view; pinning; `expectedRevision` on GUI moves
and the conflict UI; time-in-stage (the existing first-ever `stageEntered` cannot
express a return visit and a misleading age is worse than none); packaged
qualification against the previews; any Electron, runtime or IPC-security change;
any change to core, the MCP surface, gates, profiles or the six stages.
