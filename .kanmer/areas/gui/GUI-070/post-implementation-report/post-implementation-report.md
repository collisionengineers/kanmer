# Post-implementation report — GUI-070

*The author's claim, written before merge. Proof comes after, from merged main.*

## Summary

The standalone Backlog view is gone: the tab, the render branch, the
`BacklogTable` component, `windowedRows` and its 13-case suite, the stylesheet
block, and the manual chapter generated from FRD-011. Backlog is now only the
board's first column (GUI-069). Because this reverses a shipped, documented
decision, the larger half of the change is documentary: **FRD-011 is
`status: withdrawn`** with an amendment that reverses R5 and withdraws
R1/R3/R4/R6, **FRD-007 B4** is rewritten (both halves of it were false on main
the moment GUI-069 landed), **FRD-019 R5** drops the fourth view, and **PRD-001**
carries a dated note under problem 6 that the two downstream sites point at.
Multi-select and bulk move/archive/add-to-group die with the table — recorded
everywhere as **weighed and dropped, not relocated**, because that is what the
operator chose with the cost stated. Rail green; the nav and the Ctrl+1…3
renumbering were verified by driving the running app, not by reading the code.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | modified | Dropped the `BacklogTable` import, `"backlog"` from `type View` and `VIEW_LABELS`, and the whole `view === "backlog"` arm of the render ternary **with its four inline handlers** (`onMove`, `onArchive`, `onAddToGroup`, `groups`) — they had no other caller, and left behind they would be unreachable async code that still typechecks. Also extended the Ctrl+N derivation comment (the removal proved its point a second time) and dropped a stale `FRD-011 R4` citation. |
| `apps/gui/src/renderer/src/components/BacklogTable.tsx` | **removed** (257 lines) | The view. |
| `apps/gui/src/renderer/src/lib/windowedRows.ts` | **removed** (79 lines) | Sole consumer was `BacklogTable`; re-confirmed by grep after GUI-069 landed. |
| `apps/gui/src/renderer/src/lib/windowedRows.test.ts` | **removed** (111 lines, 13 cases) | Dies with the module it tests. See the note on the suite count below. |
| `apps/gui/src/renderer/src/components/FilterBar.tsx` | modified | Comment only: the group-chip lens is FRD-001 G8, not the withdrawn FRD-011 R4. The chips survive — they are a board feature and always were. |
| `apps/gui/src/renderer/src/styles.css` | modified | Deleted the `/* Backlog list view (GUI-015) */` block (52 lines, `.backlog` … `.backlog-title`). **The block, not every rule matching "backlog"** — `.check`, `.hint`, `.banner.warn` and `.spacer` are shared and untouched. The `must match ROW_HEIGHT in BacklogTable.tsx` comment went with its counterpart, so no orphan coupling remains. |
| `apps/gui/src/shared/shortcuts.ts` | modified | `Ctrl+1…4 / "Switch view (Board, Backlog, Standup, Archived)"` → `Ctrl+1…3 / "Switch view (Board, Standup, Archived)"`; deleted the three `context: "Backlog"` rows (`↑ / ↓`, `Space`, `Enter`) — those row semantics existed only inside the table and have no surviving surface; refreshed the header comment. |
| `apps/gui/src/renderer/src/manual/manual.test.ts` | modified | The one test the change forces. `["Board","Backlog","Standup","Archived"]` → `["Board","Standup","Archived"]`. The assertion is **not weakened** — it still requires the shortcut label to name every view; the set of views shrank. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | regenerated | Committed build artifact. `npm run build:manual` after the doc edits; the diff is exactly the three intended changes (getting-started prose, the dropped `backlog` chapter, the new shortcuts table). |
| `scripts/build-manual.mjs` | modified | Removed the `["backlog","The Backlog list","FRD-011-backlog-list-view.md"]` `FROM_FRD` entry. Kept, the app would regenerate a chapter explaining a view the user cannot open. `backlog` is not a deep-link target, so nothing broke. |
| `packages/ui/src/index.ts` | modified | Deleted the `BacklogTable` / `BacklogTableProps` re-exports. **The non-obvious one** — invisible from the renderer folder the ticket points at, and without it `npm run typecheck` and `npm run build:ui` both break. |
| `docs/manual/getting-started.md` | modified | The FRD-011 argument in user-facing prose ("Backlog is a list rather than a column, because…") was now false. Rewritten to say all six stages are columns and to name the withdrawn list view, rather than pretending it never existed. Chapter body stays well over the 80-char floor. |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | **modified — authorized** | `status: withdrawn` + amendment. Detail below. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | **modified — authorized** | B4, both halves. Detail below. |
| `docs/functional/frd/FRD-019-gui-shell.md` | modified | R5's view list is three, Board renders Backlog→Done. The "Verified against code — Phase 0.2" block below it is a **dated audit snapshot** and was deliberately left alone. |
| `docs/product/prd/PRD-001-kanmer-v3.md` | **modified — authorized** | Dated note under problem 6 + pointers from `:25` and `:30`. Detail below. |
| `docs/functional/frd/FRD-001-groups.md` | modified | Citation repoint only: G8's GUI surface is FRD-019's now; acceptance criterion 4 loses its `+ backlog` half; the `Related:` line marks FRD-011 withdrawn. |

**Deliberately not touched:** `apps/gui/release-notes.md:155` describes the
shipped view in past release history. It is a record, not documentation.

## Governing docs

Four documents were modified, all with explicit authorization recorded verbatim
in `open-questions`. `refs` was extended (FRD-007, FRD-019, PRD-001) so the
claim is checkable.

**`docs/functional/frd/FRD-011-backlog-list-view.md` — MODIFIES.** Now
`status: withdrawn` with a `withdrawn:` frontmatter line naming the date and
ticket. The `## Amendment (GUI-070)` section:

- **reverses R5** — "the board's Backlog column disappears from the kanban" is
  false; Backlog is the first of six columns. R5's other half (new tickets land
  in Backlog, it being the first stage) still holds and is called out as
  FRD-007's, not this document's;
- **withdraws R1/R3/R4/R6**, noting that R4's *chips* survive under FRD-001 G8
  while R1/R3/R6 have no surviving surface;
- **states bulk triage was weighed and dropped, not relocated** — named
  explicitly (multi-select, bulk move/archive/add-to-group, the per-ticket
  failure report), with the reasoning and the two options that were on the
  table, and with the recovery path (a new ticket against the column;
  `BacklogTable.tsx` is in git history) rather than a reinstatement;
- records **why the file still exists** (`build-manual.mjs` throws on a missing
  curated FRD — and a doc that argued for a design should record its own
  overturning);
- documents **the `withdrawn` convention it sets**, since this is the first such
  document in `docs/`: status + dated `withdrawn:` line, a pointer quote under
  the H1, **original requirements left readable and struck rather than deleted**,
  one `## Amendment (<TICKET>)` section, amended in place (per FRD-014,
  supersede-without-editing is the *ADR* convention).

**`docs/functional/frd/FRD-007-fixed-six-stage-board.md` B4 — MODIFIES.** Owned
entirely by this ticket by the scheduler's decision, because both halves of the
sentence reverse and splitting it would put two branches on one line. It now
states the finished position: the kanban renders all six stages Backlog → Done,
that is the only place backlog tickets appear, the list view was withdrawn, and
the Backlog column is deliberately plain because bulk triage was dropped rather
than moved.

**`docs/product/prd/PRD-001-kanmer-v3.md` — MODIFIES.** A dated note under
problem 6 recording that the v3 answer to that problem was built, shipped and
withdrawn, naming the bulk-triage loss and saying plainly that problem 6 is now
*accepted* rather than solved. The PRD states the deleted design in three places,
so `:25` and `:30` carry short inline pointers to the note — one note, three
reachable entry points, no duplicated prose.

**`docs/functional/frd/FRD-019-gui-shell.md` R5 — MODIFIES.** Three views, Board
renders Backlog→Done, with the fourth view's removal named rather than erased.

## Risks / follow-ups

- **The GUI suite is smaller by design.** 22 files / 230 tests → **21 / 217**.
  The 13 missing cases are `windowedRows.test.ts`, measured by restoring the
  original file and running it before deleting it. Not a deleted safety net —
  the code it guarded is gone.
- **No automated coverage for the nav or the Ctrl+N handler.** Pre-existing and
  on the record in `shortcuts.ts:1-13`; the handler is still an `if/else` chain
  and `apps/gui` has no jsdom/testing-library. This change was verified by
  driving the running app (below), but the next view change will face the same
  gap. Parked in `open-questions` as a test-infrastructure ticket.
- **GUI-071 must land after this**, and **its first verification criterion is
  struck by this ticket** ("Backlog tab count equals the number of rows the
  Backlog view shows" — it describes a deleted view). Done via `update_item`, not
  left for someone to notice. Its real defect — one shared count expression for
  every tab — is untouched here and still needs fixing.
- **Bulk triage is genuinely gone.** Recorded in FRD-011, FRD-007 B4 and PRD-001
  so the loss is discoverable from any of them. Reopen trigger and recovery path
  are in FRD-011's amendment.
- **Fresh-worktree gotcha (not a defect):** `npm test` fails to resolve
  `@kanmer/core` until something builds `packages/core/dist`. Run `npm run
  build:ui` (or any core build) before `npm test` in a new worktree.

## Verification hand-off

On merged `main`, from the repo root:

1. `npm run build:ui` — must be green **and must run before `npm test`** in a
   fresh checkout. Also the proof that the `packages/ui` re-export edit landed.
2. `npm test` — green; expect **21 files / 217 tests** for the GUI suite.
3. `npm run typecheck` — green across all four workspaces (`@kanmer/core`,
   `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`).
4. `npm run check:manual` — must report *up to date (11 chapters)*. This is the
   gate on the regenerated `chapters.generated.ts`.
5. `git grep -n "BacklogTable\|windowedRows" -- ':!*/dist/*' ':!*/out/*'` — must
   return **nothing**. The "no dead components or unreferenced exports" criterion.
6. GUI boot, from `apps/gui`:
   `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh>`
   — exit 0.
7. **Observe in the running app** (screenshot for the visual proof): the nav
   reads **Board / Standup / Archived** with no Backlog tab; Ctrl+1/2/3 select
   those three in order; **Ctrl+4 does nothing**; the board's first column is
   Backlog and a card in it selects and opens its editor.
8. Quote the governing-doc diffs — `git show <sha> -- docs/` — so "FRD-011
   amended, with the tradeoff recorded rather than erased" is evidenced rather
   than asserted. The line to look for is the one saying bulk triage was
   **weighed and dropped, not relocated**.
