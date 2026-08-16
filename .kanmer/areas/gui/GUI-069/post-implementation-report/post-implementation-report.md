# Post-implementation report — GUI-069

## Summary

The board now renders all six stages in stage order, so **Backlog is the first
column** instead of appearing after Done. The visible symptom was one line, but
the defect was one function: `mergeColumns` appends a fallback column for any
status found on an item that has no column, and it could not distinguish "a
status nobody ever declared" from "a status that was declared and then
deliberately hidden". Commit `841c5bc` filtered `backlog` out of the column list
and shipped exactly the second case — on any board holding a backlogged ticket
the column came straight back, at the end, labelled with its raw id. The
exclusion was defeated by the same commit that introduced it. `mergeColumns` has
moved into `lib/board.ts` and gained a third argument (the statuses the caller
*knows about*, kept distinct from the columns it *renders*), so a hidden status
stays hidden while a genuinely unknown one still earns its trailing column.
`Board.tsx` then passes the full `UI_STAGES`. Five files, one commit, full rail
green.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/lib/board.ts` | added `mergeColumns` (moved from `Board.tsx`), with a new third parameter `known: Iterable<string> = []` | This is the defect. Separating *known* statuses from *rendered* columns is what lets the function drop a deliberately-hidden status instead of resurrecting it last with the wrong name. It lives here because `apps/gui` has **no component-test harness** — every suite is a pure-function vitest suite — so a module-private helper inside `Board.tsx` cannot be asserted at all, and all three of the ticket's verification criteria are statements about this function's behaviour. The file already owns exactly this class of helper (`columnCards`, `positionForDrop`, `optimisticOrder`). The comment above it names `841c5bc` so the next reader cannot repeat it. |
| `apps/gui/src/renderer/src/lib/board.test.ts` | added `describe("mergeColumns")` — 8 cases; imported `UI_STAGES` | Turns the ticket's three verification criteria into assertions. Two are genuine regression tests against the shipped bug: "renders Backlog first, and only once, when backlog tickets are present" and "never resurrects a known status that was deliberately not rendered" both fail against the old implementation. A third pins the `known`-omitted default so the new parameter cannot silently change a future caller. |
| `apps/gui/src/renderer/src/components/Board.tsx` | removed the local `mergeColumns` and the `.filter((s) => s.id !== "backlog")` + its FRD-011 comment; imported `mergeColumns` from `../lib/board.js`; passes full `UI_STAGES` as rendered columns **and** the full stage id list as known ids; dropped the now-unused `BoardColumn` type import | Renders all six stages, always, in stage order. Rendering the full list — rather than the statuses that happen to be present — is what stops the board gaining and losing a column as a count crosses zero (criterion 2). Nothing else in the component changed: no `useMemo`, no `Card` prop changes, no touching `itemsRef` or the drop maths. |
| `packages/ui/src/index.ts` | added `mergeColumns` to the "Pure helpers the components are built on" export block | The standing obligation recorded in `841c5bc`. **`packages/ui` is tracked in git** (21 files under `git ls-files`, `index.ts` present in `origin/main@5d0e0d7`); the research doc's "untracked" note was true when written and is now stale. |
| `apps/gui/release-notes.md` | new entry under `## 0.3.3 (unreleased)` | Explains what changed and, briefly, why nobody chose the old behaviour. Line 153 (a shipped release's notes, i.e. history) was **not** touched. |

**Not touched, deliberately:** `App.tsx` (GUI-070 and GUI-071's lane — a
conflict-free parallel lane depends on it), `styles.css`, `BacklogTable.tsx`,
`packages/core/src/stages.ts`, `apps/gui/src/shared/stages.ts`, and every FRD.
`git diff --name-only origin/main` returns exactly the five files above.

## Governing docs

`refs`: `FRD-007-fixed-six-stage-board.md`, `FRD-011-backlog-list-view.md`.
**This ticket amends neither.** Both are contradicted by it, and GUI-070 is the
single owner of both amendments. Restating the plan's Governing-docs section,
because a reviewer must weigh it:

- **FRD-007 B4** — "The kanban renders Preparing → Done; Backlog renders as the
  dedicated list view (FRD-011)." **One sentence whose both halves reverse**:
  GUI-069 falsifies the first, GUI-070 the second. Splitting it means two
  branches editing the same line — a guaranteed conflict, not a theoretical one.
- **FRD-011** — Overview line 10 and R5 line 18 say the same thing. GUI-070 owns
  every FRD-011 edit, reinforced by a mechanical reason: FRD-011's Overview is
  *lead prose*, compiled by `scripts/build-manual.mjs` into the committed
  `chapters.generated.ts` and guarded by `npm run check:manual`. Two editors
  means two regenerations of one machine-written file.

**Stated plainly: between this PR merging and GUI-070 merging, FRD-007 B4 and
FRD-011 R5 are false.** They describe a kanban starting at Preparing and a
Backlog column that disappears; after this PR, the kanban starts at Backlog and
the column stays. **GUI-070 — "Remove the separate Backlog view" — is the ticket
that corrects both**, and it is blocked by this one, so the window is bounded to
the gap between two PRs in the same lane and release. If GUI-070 is dropped or
deferred, the amendments must be re-homed rather than forgotten.

No new ADR: the six-stage order is already authoritative in
`packages/core/src/stages.ts` and mirrored in `apps/gui/src/shared/stages.ts`.
This ticket makes the board agree with them; it decides nothing new.

## Risks / follow-ups

- **`Board.tsx` is the app's most delicate component** (memoized `Card`,
  `itemsRef` drop callbacks, `gridTemplateColumns` from `statuses.length`). The
  diff there is the import line, the column expression and one unused type — no
  behavioural code touched. The sixth column's width is absorbed by
  `.content { overflow: auto }` (`styles.css:205-210`); no layout change needed.
- **The third `mergeColumns` argument is a no-op at today's only call site**
  (rendered == known), which can read as speculative generality in a `fix`. It
  is not: it *is* the defect. `841c5bc` proved that conflating the two silently
  reverses an intended exclusion, and the test for it is a regression test.
- **No new gate or IPC surface.** Backward moves cross no boundary
  (`packages/core/src/stages.ts:133-137`) and `getGateStatus` already returns a
  map over every board stage, so Backlog as a drop target needed no
  main-process or preload change. Ctrl+← out of Preparing already moved a card
  to `backlog`; it now lands somewhere sensible instead of flying to the far
  right.
- **Follow-up: [[GUI-070]]** — owns the FRD-007 and FRD-011 amendments and
  removes the now-redundant Backlog view. **This PR unblocks it.**
- Not filed, deliberately: stage-coloured column headers. `color: s.color`
  remains dead data on every column, as it was before this ticket (open question
  Q1, answered (a)). Nobody has asked for coloured headers, and adding them
  would be a design change to all six.

## Verification hand-off

On merged `main`, from the repo root:

| Command | Expected |
|---|---|
| `npm test` | 21 files / 210 tests pass, including `board.test.ts` 25/25 with the 8 `mergeColumns` cases. `shared/stages.test.ts` staying green is the signal the fix did not stray into the stage-definition layer. |
| `npm run typecheck` | Clean, with **all four** workspaces named in the output — not the `-w` form. |
| `npm run build:ui` | `@kanmer/core` + `@kanmer/ui` build (the barrel changed). |
| `npm run build -w @kanmer/gui` | Renderer bundle builds. |
| `npm run check:manual` | `manual: up to date (12 chapters)` — **confirming** no regeneration is needed, not assuming it. |
| `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh>` from `apps/gui` | exit 0. |

The screenshot-equivalent for this UI change is the `mergeColumns` suite: with
no component harness in `apps/gui`, the column order is asserted there rather
than eyeballed. A human sanity check on a real board is still worth it — six
columns, BACKLOG leftmost, and Ctrl+← out of Preparing landing a card in it.
