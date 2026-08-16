## Scheduler decisions — 2026-08-16, HZN-003 auto run

Both open questions are resolved here. Neither needed the operator: Q1 is a
scope call and Q2 is a mechanical conflict-avoidance call. Do not escalate them.

**Q1 — must board column headers render the stage colour?
ANSWERED: (a). Criterion 1 means "Backlog is a real column from `STAGES`, given the
same `.col-head` treatment as every other column". No CSS change. `color: s.color`
stays dead data.**

Research established that *no* column renders a stage colour today — `Board.tsx:119`
carries `color: s.color` into the column objects and nothing reads it, the board's
only `columnColor` call resolves against `board.areas`, and `.col-head` sets only
`color: var(--muted)`. Adding stage colour would therefore be a design change to
all six headers, not a fix to one. That is scope drift inside a `fix` ticket and
review would rightly push back. The only visible defect is the position; fix that.

If stage-coloured headers are wanted, they are their own ticket. Do not file it
speculatively — nobody has asked for it.

**Q2 — who amends FRD-007 B4?
ANSWERED: GUI-070 owns FRD-007 B4 entirely. GUI-069 amends NO FRD.**

GUI-069's research proposed splitting B4 between the two tickets; GUI-070's
research proposed GUI-070 as single owner. Single owner wins, and the reason is
mechanical rather than editorial: **B4 is one sentence** — "The kanban renders
Preparing → Done; Backlog renders as the dedicated list view (FRD-011)" — and both
halves reverse. Splitting it means two branches editing the same line, which is a
guaranteed conflict, not a theoretical one.

GUI-070 lands second (GUI-069 blocks it), so it is the only ticket that can state
the finished position in one edit. It therefore owns **both** FRD-007 B4 and every
FRD-011 edit.

**The cost, stated plainly rather than hidden:** between GUI-069 merging and
GUI-070 merging, FRD-007 B4 and FRD-011 R5 describe a Backlog that no longer
behaves that way. The window is bounded because GUI-069 blocks GUI-070 and both
are in the same lane and the same release. **GUI-069's plan must say this in its
Governing-docs section, naming GUI-070 as the ticket that corrects it.** An
unstated temporary falsehood in a governing doc is how these become permanent.

Bonus consequence: GUI-069 requires no manual rebuild. `scripts/build-manual.mjs`
compiles curated FRDs' *lead prose* into the committed `chapters.generated.ts`;
FRD-007 B4 sits below the first `##` and is not lead prose. FRD-011's Overview
*is* lead prose — which is a second, independent reason FRD-011 belongs to a
single owner.

**Lane C order: GUI-069 → GUI-070 → GUI-071. GUI-069 is unblocked and is the head
of the lane.** It is file-disjoint from both successors (it touches only
`Board.tsx` and the new `lib/board.ts`; they live in `App.tsx`).

Also settled during research and not to be re-opened: always render all six
columns regardless of backlog count; move `mergeColumns` into `lib/board.ts` and
export it from the `@kanmer/ui` barrel so it is assertable at all (there is no
component-test harness in `apps/gui`); no new gate or IPC work.
