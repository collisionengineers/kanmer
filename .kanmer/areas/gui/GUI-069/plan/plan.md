# Plan — GUI-069: Render Backlog as the first board column, not the last

Written FROM `research` and `files`. Both open questions are answered (see
`open-questions`, and `scratch/scheduling.md` for the reasoning); nothing below
re-opens them.

## Approach

Stop filtering `backlog` out of the column list, and fix the ambiguity in
`mergeColumns` that silently undid that filter in the first place. `Board.tsx`
renders the full six-stage `UI_STAGES` — so Backlog is a real column, first, in
stage order, with the same `.col-head` treatment as every other column, and the
board's column list stops depending on which statuses happen to be present (a
zero-backlog board still shows six columns). `mergeColumns` moves out of
`Board.tsx` into `lib/board.ts`, gains a third argument — the set of **known**
status ids, separate from the list of **rendered** columns — and drops a
known-but-hidden status instead of resurrecting it at the end, while still
appending a trailing fallback column for a genuinely unknown status.

Two alternatives were rejected. **Deleting the `.filter(...)` alone** fixes the
symptom and leaves the defect: `mergeColumns` still cannot tell "unknown status"
from "known status, deliberately hidden", so the next stage anyone hides
re-appears last in exactly the same way — that is the bug commit `841c5bc`
already shipped once, and repeating it in the opposite direction is not a fix.
**Genuinely excluding backlog** (teaching `mergeColumns` to hide it properly and
leaving the list view as the only route) is coherent, but GUI-070 removes that
view, so it would leave a window with no way to see backlog tickets at all.

The change is deliberately confined to `Board.tsx`, `lib/board.ts`,
`lib/board.test.ts`, the `@kanmer/ui` barrel and `release-notes.md`. It does
**not** touch `App.tsx` (GUI-070 and GUI-071's lane), `styles.css`, or any FRD.

## Governing docs

`refs`: `docs/functional/frd/FRD-007-fixed-six-stage-board.md`,
`docs/functional/frd/FRD-011-backlog-list-view.md`.

- **FRD-007 — contradicted; amended by GUI-070, not here.**
  B4 (line 28) reads "The kanban renders Preparing → Done; Backlog renders as
  the dedicated list view (FRD-011)." This ticket makes the first half false and
  GUI-070 makes the second half false. B4 is **one sentence whose both halves
  reverse**, so splitting it across two branches means two branches editing the
  same line — a guaranteed conflict, not a theoretical one. GUI-070 lands second
  (GUI-069 blocks it) and is therefore the only ticket that can state the
  finished position in a single edit. **GUI-069 amends no FRD.**
- **FRD-011 — contradicted; amended by GUI-070, not here.**
  R5 (line 18) reads "the board's Backlog column disappears from the kanban";
  the Overview (line 10) repeats "the kanban renders Preparing → Done". GUI-070
  owns every FRD-011 edit, for the same single-owner reason plus a mechanical
  one: FRD-011's Overview is *lead prose*, which `scripts/build-manual.mjs`
  compiles into the committed artifact `chapters.generated.ts` (guarded by
  `npm run check:manual`). Two tickets editing it means two tickets regenerating
  the same machine-written file.

**Stated plainly, because an unstated temporary falsehood in a governing doc is
how it becomes permanent: between GUI-069 merging and GUI-070 merging, FRD-007
B4 and FRD-011 R5 are false.** They describe a Backlog column that disappears
from the kanban and a kanban that starts at Preparing; after this ticket, the
kanban starts at Backlog and that column does not disappear. **GUI-070 —
"Remove the separate Backlog view" — is the ticket that corrects both**, and it
is blocked by this one, so the window is bounded to the gap between two PRs in
the same lane and the same release. If GUI-070 is dropped or deferred, the FRD
amendments must be re-homed rather than forgotten.

- **No new ADR.** Nothing here is a new design decision: the six-stage order is
  already authoritative in `packages/core/src/stages.ts` and mirrored in
  `apps/gui/src/shared/stages.ts`, and this ticket makes the board agree with it.
- **No manual regeneration.** No curated FRD lead prose changes, so
  `chapters.generated.ts` stays valid — confirmed by running
  `npm run check:manual`, not assumed.

## Steps

1. **Move `mergeColumns` into `lib/board.ts`.** Lift it out of `Board.tsx:29-34`
   verbatim, then give it a third parameter — the **known** status ids, distinct
   from the **rendered** columns. A status that is known but not rendered is
   deliberately hidden and must be dropped; a status that is neither known nor
   rendered is unknown and still gets a trailing `{ id, name: id }` fallback
   column. Keep it pure and dependency-free, matching the file's other helpers,
   and document *why* the third argument exists (this is the defect).
2. **Cover it in `lib/board.test.ts`** with a `describe("mergeColumns")` block
   asserting the three verification criteria plus the regression itself:
   configured columns render in their given order; an unknown status appends
   last; a known-but-hidden status is never resurrected; and the exact `841c5bc`
   shape — a full stage list with `backlog` first — puts Backlog first with no
   duplicate. House style: pure functions, no DOM.
3. **Point `Board.tsx` at it.** Delete the local copy and the
   `.filter((s) => s.id !== "backlog")` with its FRD-011 comment; import
   `mergeColumns` from `../lib/board.js`; pass the full `UI_STAGES` as the
   rendered columns and the full stage id list as the known ids. Nothing else in
   the component changes — no `useMemo`, no `Card` prop changes, no touching the
   drag/drop maths or `itemsRef` (a fresh `Set` or object into `Card` re-renders
   the whole board on every dragover).
4. **Export `mergeColumns` from the `@kanmer/ui` barrel**
   (`packages/ui/src/index.ts`), in the "Pure helpers the components are built
   on" block, alphabetically. This is the standing obligation recorded in
   `841c5bc`. `packages/ui` is tracked in git as of `origin/main@5d0e0d7`
   (research's "untracked" note is stale) — confirm with `git ls-files` before
   editing.
5. **Add a release-notes entry** under `## 0.3.3 (unreleased — notes
   accumulating)` in `apps/gui/release-notes.md`. Do **not** edit line 153 —
   that is a shipped release's notes, i.e. history.
6. **Run the rail and open the PR.**

## Verification

`proof.md` is produced on merged main from:

- `npm test` — `@kanmer/core` + `@kanmer/gui` vitest suites. The new
  `mergeColumns` block is where all three of the ticket's verification criteria
  become assertions rather than eyeballing; `shared/stages.test.ts`
  (`UI_STAGES` ≡ core's `STAGES`) staying green is the signal the fix did not
  stray into the stage-definition layer.
- `npm run typecheck` — all workspaces, not `-w`.
- `npm run build:ui` — the barrel changed, so `@kanmer/core` + `@kanmer/ui`
  must build.
- `npm run build -w @kanmer/gui` — renderer bundle.
- `npm run check:manual` — **confirming** no regeneration is needed rather than
  assuming it.
- GUI smoke boot (AGENTS.md §10.5): board opens with six columns, BACKLOG
  leftmost, and Ctrl+← out of Preparing lands a card in that column instead of
  sending it off the right-hand end.

Core, the MCP server and the plugin bundle are untouched, so AGENTS.md §10.6
does not apply.

## Risks / open questions

- **Board.tsx is the app's most delicate component** — memoized `Card`,
  `itemsRef` drop callbacks, `gridTemplateColumns` computed from
  `statuses.length`. Mitigation: change only the column-list expression and the
  import; resist tidying anything else while in the file. The extra column's
  width is absorbed by `.content { overflow: auto }` (`styles.css:205-210`), so
  no layout work is needed.
- **The third `mergeColumns` argument is a no-op at today's only call site**
  (rendered columns == known ids), which can read as speculative generality in a
  `fix`. It is not: it is the defect itself. `841c5bc` proved that a column list
  and a known-status list being conflated silently reverses an intended
  exclusion, and the test for it is a regression test, not a feature.
- **Lane conflict.** GUI-070 and GUI-071 both edit `App.tsx`. This ticket must
  not. If a step seems to require `App.tsx`, stop — it has strayed.
- **No open questions remain.** Q1 and Q2 are answered in `open-questions`;
  Q3–Q5 were resolved during research.
