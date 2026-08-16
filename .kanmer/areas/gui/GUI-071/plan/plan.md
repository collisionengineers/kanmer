# Plan — GUI-071: Fix the view tab counts: every tab shows the whole board

Written FROM `research`, `files`, `open-questions`, `scratch/notes.md` and
`scratch/operator-answers.md`. **All three input documents describe the tree at
`14f2715`, before GUI-070.** This plan is written against `origin/main` at
`0c4ffda`, with GUI-070 (`2f06713`) merged. Every line number below was
re-located in that tree, as `files` instructed.

## What GUI-070 changed under this ticket

| Research finding | State on `0c4ffda` |
|---|---|
| F1 — shared count expression | **Still live**, moved to `App.tsx:1068-1074`. `v` still appears only in the `archived` test. |
| F3 row 1 — `allViewItems` | **Survives**, moved to `App.tsx:957-963`. |
| F3 row 2 — inlined tab count | **Survives**, `App.tsx:1070-1072`. |
| F3 row 3 — `FilterBar` items prop | **Survives**, `App.tsx:1153`. |
| F3 row 4 — `BacklogTable` filter | **Deleted by GUI-070.** Component, `windowedRows.ts`, the `backlog` key and the branch are all gone. |
| F4 — corrupted empty states | **Resolved by GUI-070**, incidentally. The empty states at `App.tsx:1213-1235` read `allViewItems`, which is now correct for both surviving counted views. It is a *regression site*, not a defect to fix. |
| F7 — Backlog tab reads the board total | **Moot.** No Backlog tab. |

So **three duplications survive**, and — this matters for honest reporting —
**the two remaining counted tabs currently print the numerically correct
number**. Board renders every non-archived ticket, and the `else` branch counts
exactly that; Archived renders every archived item, and the `archived` branch
counts exactly that. The two branches of the shared expression coincide with
the two surviving views' predicates.

That coincidence *is* the defect. The expression is not "the count of view
`v`" — it is "the archived count, or the board count", and it agrees with the
views only because Backlog, the view whose predicate differed, was deleted. A
fourth view, or any change to what Board renders, silently breaks it again with
no signal. The ticket's own words: *"a missing branch, not a drifted filter"*.
GUI-070 removed the symptom and left the branch still missing.

## Approach

**Extract one keyed view table into `apps/gui/src/renderer/src/lib/views.ts`**
that carries, per view, its label, the items it renders (before search and
filters), and whether its tab shows a badge — then drive the tab strip, the
Ctrl+1…3 shortcuts, `allViewItems` and the `FilterBar` items prop from it.

The alternative — adding a `v === "ticket"` branch to the JSX at `:1070` — was
rejected for the reason the operator gave: it produces four copies of the rule
where there are three, and it re-arms the same class of bug the moment a view
is added. It is also untestable: `apps/gui` has no jsdom, no
`@testing-library/react` and no vitest config, so an assertion against JSX is
unreachable and **adding a DOM environment is explicitly out of scope**
(Q4, and the operator repeated it). A pure `(view, items)` function in `lib/`
is the only shape in which the verification criterion can be asserted at all.

**Keying label, predicate and badge into a single `Record<View, ViewSpec>` is
the structural point.** `App.tsx:928-934` already carries GUI-070's comment
warning that a parallel array of views went stale the moment a view was added,
and that deriving from one source removed the class of bug rather than the
instance. The count is the next parallel structure that has not yet been
derived. One record means adding a view will not compile until its item set is
supplied, which is what makes the badge unable to drift from the view again.

Explicitly *not* doing:
- **No `backlog` case.** `View` is `ticket | standup | archived` (Q3, GUI-070).
- **No change to what Board counts.** All non-archived tickets, Done included —
  binding operator decision, 2026-08-16. This change is purely structural.
- **No change to whether counts respect filters.** They do not, and per the
  operator answer that is correct and deliberate. `viewItemsFor` takes only
  `(view, items)` — the signature makes the badge structurally incapable of
  seeing a filter, which is the contract the FRD will state.
- **Not normalising the Archived/Board asymmetry.** Archived counts archived
  *items* including groups because the Archived view renders them (Q5). Board
  excludes non-tickets because the board renders only tickets. The test asserts
  the asymmetry so nobody "tidies" it.
- **Not touching `Board.tsx`** (GUI-069's file; its column counts are already
  derived from what it renders) or `lib/standup.ts:88`'s separate "active"
  predicate (scope creep, parked).

### Standup

Standup's tab has no badge by design. Its `ViewSpec.items` returns the same set
as Board — non-archived tickets — which is exactly what `allViewItems`
evaluates to for the standup view today, so behaviour is unchanged. (`Standup`
itself is handed the raw `items` and does its own reduction in `lib/standup.ts`;
`allViewItems`/`viewItems` are inert while it is showing, both before and after
this change.) `counted: false` keeps the badge suppression in the table instead
of the `v !== "standup"` literal in the JSX.

## Governing docs

**`docs/functional/frd/FRD-019-gui-shell.md`** — the ticket's only `ref`.

- **Meets R5** — the view list stays exactly three (Board, Standup, Archived,
  Ctrl+1…3); this change moves that list into `lib/views.ts` without altering
  it, and the "verified against code" note for R5 stays true.
- **Modifies R5 — authorized, and required work.** The operator answer names
  this as one of two required deliverables: *"Document the difference
  deliberately… `FRD-019` R5 lists the views and is currently silent on
  badges — that silence is what made this ambiguous."* R5 gains the badge
  semantics: **a tab badge counts everything that lives in that view and
  ignores the active search and filters; the Board's per-column counts do
  respond to them.** Both numbers sit in the same header area answering
  different questions, and the FRD now says which is which, so the difference
  reads as a decision rather than a defect. It also records what each view's
  badge counts (Board: all non-archived tickets, Done included; Archived: all
  archived items, groups included; Standup: no badge) and that the rule lives
  in `lib/views.ts` under test.
- **No new ADR.** No architectural decision is introduced — the two decisions
  this ticket rests on were made by the operator and are being written into the
  FRD, which is where they belong.

## Steps

1. **Create `apps/gui/src/renderer/src/lib/views.ts`.** Move `View` and
   `VIEW_LABELS` out of `App.tsx:48-54` into a single
   `VIEWS: Record<View, ViewSpec>` where `ViewSpec = { label, items(items),
   counted }`. Export `VIEW_IDS`, `viewItemsFor(view, items)` and
   `viewCount(view, items): number | null`. `import type` only from
   `@kanmer/core` (AGENTS.md §7 — the renderer is a browser context). Comment
   *why* the three facts are keyed together, per `lib/board.ts`'s house style.
2. **Write `apps/gui/src/renderer/src/lib/views.test.ts`.** Cover: Board counts
   all non-archived tickets including Done and excluding groups; Archived
   counts archived items *including* groups; Standup has no badge; a ticket
   moving between stages leaves Board's count alone while archiving it moves
   one from Board to Archived; and — the criterion, asserted **exhaustively
   over `VIEW_IDS`** so a future view is covered without editing the test —
   every badge equals `viewItemsFor(view, items).length`, the rows that view
   shows with no filter applied.
3. **Rewire `App.tsx`.** Import from `./lib/views.js`; delete the local `View`
   and `VIEW_LABELS`; `allViewItems` becomes `viewItemsFor(view, items)`; the
   Ctrl+1…9 handler reads `VIEW_IDS`; the tab strip renders `VIEWS[v].label`
   and a badge from a `useMemo`'d `Record<View, number | null>` keyed on
   `items` (so the per-tab count is computed once per board change, not once
   per tab per render, and its dependency list is explicit).
4. **Collapse the third duplication:** `FilterBar`'s `items` prop
   (`App.tsx:1153`) becomes `allViewItems`. It is only rendered when
   `view === "ticket"`, where the two expressions are identical today — so the
   facet-narrowing ripple `files` flagged does not arise, and the last inline
   copy of the rule goes away.
5. **Check the empty states** (`App.tsx:1213-1235`) still behave: `view !==
   "standup"` guard intact, zero-item Board and zero-item Archived each show
   their message, a filter that matches nothing shows "No matches". This is the
   named regression site.
6. **Write FRD-019 R5** per the Governing docs section above.
7. **Run the rail** and drive the app to observe the badges.

## Verification

`proof.md` is produced from:

- `npm test` — the new `lib/views.test.ts` cases, and no regression elsewhere.
  Known hazard: `apps/gui/src/main/kanmerGit.test.ts` flakes under concurrent
  load (real git subprocesses against a 5s vitest timeout, plus Windows `EPERM`
  on temp cleanup). It is pre-existing with its own ticket. If it fails, rerun
  that file alone with `--testTimeout=30000` and report what was found; do not
  chase it.
- `npm run typecheck` — clean, including the moved `View` export surface.
- `npm run build:ui`.
- `npm run check:manual` — **11 chapters** since GUI-070, not 12.
- **Observed in the running app:** Board and Archived badges read the same
  numbers before and after the change (this is a no-behaviour-change fix for
  the numbers themselves); typing in the search box narrows the board's column
  counts while both tab badges hold still — the documented, deliberate
  difference; archiving a ticket decrements Board and increments Archived live.
  If Electron is driven via CDP, kill the PID afterwards — `child.kill()` does
  not reap the helper processes and a stray `electron.exe` blocks
  `git worktree remove` at closeout.

## Risks / open questions

- **No open questions.** Q1, Q3, Q4, Q5, Q6 were resolved in `open-questions`;
  Q2 was answered by the operator on 2026-08-16 (`scratch/operator-answers.md`)
  — tab counts ignore filters, and documenting that difference in FRD-019 R5 is
  required work, carried as step 6.
- **Risk: the numbers do not change, so a careless reviewer reads this as a
  no-op.** Mitigation: the post-implementation report and the PR body state
  plainly that GUI-070 removed the visible symptom and that what ships is the
  missing branch plus the test and the documented meaning that keep it fixed.
- **Risk: empty states regress** (`files` names this the most likely one).
  Mitigation: step 5, plus the fact that `viewItemsFor` returns exactly
  today's set for every surviving view — the sets are unchanged, only their
  source is.
- **Risk: moving `View` out of `App.tsx` breaks an unseen consumer.**
  Mitigation: checked — `grep` across `apps/gui/src` finds `View` and
  `VIEW_LABELS` used in `App.tsx` only; `shared/shortcuts.ts` holds a
  hand-written *label* string, not the type, and is unaffected.
- **Risk: GUI-065 is queued behind this on the same `App.tsx`.** Mitigation:
  merge promptly and announce it.
