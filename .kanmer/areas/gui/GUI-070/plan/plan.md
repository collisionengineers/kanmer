# Plan — GUI-070: Remove the separate Backlog view

*Written FROM `research` and `files`, and scoped by the operator's binding
answers in `scratch/operator-answers.md` (2026-08-16).*

## Pre-flight: GUI-069 has landed — checked, not assumed

`files` set the cheapest possible gate: *if `Board.tsx` still reads
`STAGES.filter((s) => s.id !== "backlog")`, GUI-069 has not landed and this
ticket must not proceed.* Checked on `origin/main` at `488797d`:
`Board.tsx:108-116` now maps **all six** `STAGES` into `mergeColumns` and passes
a third argument (the known-status ids) so a deliberately-rendered status never
falls into the unknown-status fallback. The filter is gone. **Pre-flight passes;
Backlog is a real first column and the view can go.**

## Approach

Option 1 from the ticket body, as the operator settled it: **accept the loss.**
Delete the tab, the render branch, `BacklogTable.tsx`, `windowedRows.ts` and its
test, the CSS block, and the manual chapter — and port nothing. Option 2 (moving
multi-select and bulk move/archive/add-to-group onto the board) was weighed and
rejected: GUI-069 shipped a deliberately plain Backlog column, so porting the
affordances would contradict the ticket that just landed as well as the
operator's decision. The alternative of *quietly* deleting was rejected for the
reason the ticket body gives — this reverses a shipped, documented decision, and
the governing documents that argued for it must be reversed in the same commit
or the repo is left describing a feature that does not exist.

The one structural judgement this plan adds: **the documentation half is the
larger half and it has a single owner — this ticket.** GUI-069 amended no FRD by
design, so as of `488797d` **FRD-007 B4 and FRD-011 R5 are both false on main**.
They are corrected here, together, in one edit each, rather than split across two
branches touching the same sentence.

## Governing docs

`refs` currently lists FRD-011 only. This plan **modifies** four governing
documents and repoints two stale citations. All four modifications are
explicitly authorized: the ticket body mandates FRD-011; the operator's answers
(recorded verbatim in `open-questions`) mandate FRD-007 B4, PRD-001, and the
`withdrawn` status precedent. `refs` gains FRD-007, FRD-019 and PRD-001 via
`link_doc` so review can see the claim it must check.

- **`docs/functional/frd/FRD-011-backlog-list-view.md` — MODIFIES (authorized:
  ticket body + operator).** `status: draft` → **`status: withdrawn`**, plus an
  `## Amendment (GUI-070)` section that **reverses R5** ("the board's Backlog
  column disappears from the kanban" — it does not; GUI-069 made it the first
  column) and marks **R1/R3/R4/R6 withdrawn** with the reason. The file stays on
  disk: `scripts/build-manual.mjs:64` throws on a missing curated FRD, and the
  amendment is the record.

  **There is no `withdrawn` precedent anywhere in `docs/`** — every FRD is
  `draft` or `approved` — so this edit *sets* the convention. It is therefore
  written to be copied: the frontmatter carries the status, a one-line
  `withdrawn:` reason names the ticket that withdrew it, the original
  requirements are left **intact and readable** above (a withdrawn doc is
  history, not a blank page), and the amendment section states what is true now.

  The amendment must say **bulk triage was weighed and dropped, not relocated.**
  Multi-select and bulk move/archive/add-to-group die with `BacklogTable`;
  nothing on the board replaces them. Any wording implying the capability moved
  is wrong and will be caught in review.

- **`docs/functional/frd/FRD-007-fixed-six-stage-board.md` — MODIFIES
  (authorized: operator/scheduler, sole owner).** B4 reads "The kanban renders
  Preparing → Done; Backlog renders as the dedicated list view (FRD-011)."
  **Both halves are now false** and both are rewritten in one sentence: the
  kanban renders all six stages Backlog → Done (GUI-069), and the dedicated list
  view was withdrawn (GUI-070). The trailing `Related:` line's
  "FRD-011 (backlog view)" is annotated `(withdrawn)` so a reader following the
  pointer is not surprised.

- **`docs/product/prd/PRD-001-kanmer-v3.md` — MODIFIES (authorized: operator,
  "YES").** A **dated note under problem 6** recording that the list view was
  built, shipped and withdrawn in favour of a Backlog column, naming the
  bulk-triage loss. Problem 6's own text ("a 194-card Backlog column is a list
  problem wearing a kanban costume") stays — it was a true observation and the
  PRD is a record of the shaping, not a live spec. The operator required that a
  reader of **any** of the three sites reaches the note, so the two downstream
  sites (`:25` "a backlog view built for volume" and `:30` "the backlog is
  triaged in the list view") each get a short inline `— withdrawn 2026-08-16; see
  the note under problem 6` pointer. Three sites, one note, no duplicated prose.

- **`docs/functional/frd/FRD-019-gui-shell.md` — MODIFIES.** R5's view list drops
  `Backlog (FRD-011)` and Board's range becomes Backlog → Done. The
  "Verified against code — Phase 0.2" block below it is a **dated audit
  snapshot** and is left alone, exactly as `apps/gui/release-notes.md` is —
  amending a historical record is the trap `files` warns about.

- **`docs/functional/frd/FRD-001-groups.md` — citation repoint only.** G8 cites
  "FRD-011/019" for the group-chip GUI surface. The chips **survive**: they live
  in `FilterBar`, which renders only for the board view. So the surface is
  FRD-019's alone now and the citation says so. `:34`'s acceptance criterion
  "narrows every view (board + backlog)" loses its dead half.

- **Source comments citing FRD-011 R4** (`FilterBar.tsx:5`, `App.tsx:1722`) point
  at a requirement that is about to be withdrawn, for a feature that survives.
  They keep `FRD-001 G8` and drop the R4 half.

- **`apps/gui/release-notes.md:155`** describes the shipped view in past release
  history. **Not touched.** Named here so review does not read the omission as an
  oversight.

## Steps

1. **Worktree.** `git worktree add .worktrees/gui-070 -b gui-070-remove-backlog-view origin/main`;
   `take_ticket GUI-070`.
2. **`App.tsx` — remove the view.** Drop the `BacklogTable` import (`:35`),
   `"backlog"` from `type View` (`:49`) and from `VIEW_LABELS` (`:53`), and the
   whole `view === "backlog" ? (…)` arm of the render ternary (`:1184-1212`)
   **including its four inline handlers** (`onMove`, `onArchive`,
   `onAddToGroup`, `groups`) — they have no other caller. The ternary chain is
   Board / backlog / standup / else-Archived; cutting the middle arm wrong
   silently reroutes a view, so re-read the chain after the edit.
3. **Delete the dead files.** `components/BacklogTable.tsx`,
   `lib/windowedRows.ts`, `lib/windowedRows.test.ts`. Re-run
   `grep -r windowedRows` first: GUI-069 should not have virtualized the new
   column, but the sole-consumer finding was made before it landed and is worth
   re-confirming rather than trusting.
4. **`packages/ui/src/index.ts` — drop `:17-18`**, the `BacklogTable` /
   `BacklogTableProps` re-exports. Same commit as step 3 or `npm run typecheck`
   and `npm run build:ui` break. This is the edit that is invisible from the
   renderer folder the ticket points at.
5. **`styles.css` — delete the `/* Backlog list view (GUI-015) */` block**
   (`:1789-1839`, `.backlog` … `.backlog-title`). Delete *the block*, not every
   rule matching "backlog": `.check`, `.hint`, `.banner.warn`, `.spacer` are
   shared by other surfaces. The `must match ROW_HEIGHT in BacklogTable.tsx`
   comment goes with its counterpart, leaving no orphan coupling.
6. **`shared/shortcuts.ts`** — `Ctrl+1…4 / "Switch view (Board, Backlog,
   Standup, Archived)"` → `Ctrl+1…3 / "Switch view (Board, Standup,
   Archived)"`; delete the three `context: "Backlog"` rows (`↑ / ↓`, `Space`,
   `Enter`) — arrow/Space/Enter row semantics existed only inside
   `BacklogTable` and have no surviving home; refresh the header comment
   (`:10-12`) whose example is the Backlog view. `manual.test.ts` parses this
   table with a strict "nothing extra" row diff, so the shape must stay exact.
7. **`manual/manual.test.ts:60`** — `["Board","Backlog","Standup","Archived"]` →
   `["Board","Standup","Archived"]`. Update the assertion to the new reality; do
   not weaken it. This is the only test the change forces.
8. **`scripts/build-manual.mjs:35`** — remove the
   `["backlog","The Backlog list","FRD-011-backlog-list-view.md"]` entry from
   `FROM_FRD`. Kept, the app regenerates a manual chapter for a view the user
   cannot open. `backlog` is not a deep-link target (`manual.test.ts:66-73`), so
   nothing breaks.
9. **`docs/manual/getting-started.md:11-12`** — rewrite "Backlog is a list rather
   than a column, because a long queue is something you scan and triage…". It is
   FRD-011's argument in user-facing prose and it is now false. Keep the
   paragraph substantial: `manual.test.ts:14-19` requires every chapter body
   over 80 characters, and this is chapter 0.
10. **Governing docs** — the five edits and two citation repoints in
    *Governing docs* above. Do these **before** step 12: FRD-011's Overview is
    lead prose the manual build reads, and `getting-started.md` is chapter 0.
11. **Source comment citations** — `FilterBar.tsx:5` and `App.tsx:1722`.
12. **`npm run build:manual`, commit `chapters.generated.ts`.** It is a committed
    artifact, never hand-edited, and `npm run check:manual` diffs it.
13. **Rail:** `npm test`, `npm run typecheck` (whole repo, per AGENTS.md §10 item
    3 — not `-w @kanmer/gui`), `npm run build:ui`, `npm run check:manual`.
14. **Runtime check** — `KANMER_SMOKE=1` electron boot. The ticket asks for the
    Ctrl+N renumbering to be *verified*, and `shortcuts.ts:1-13` states on the
    record that no test covers the handler. Reading the derivation is not the
    check; booting is.
15. **Rebase and re-run.** GUI-072 is in flight in `styles.css` at `:82-92`,
    `:602-612`, `:1322-1332` — disjoint from this ticket's `:1789-1839`, but
    line numbers shift. `git fetch origin && git rebase origin/main`, then
    **re-run the whole rail** before opening the PR.
16. **Strike GUI-071's dead criterion.** Its first verification line — "Backlog
    tab count equals the number of rows the Backlog view shows" — describes a
    view this ticket deletes. Edit GUI-071's body via `update_item` when this
    merges. Not a note for someone to notice later; a step in this plan.

## Verification

Proof comes from the rail run on **merged main**, not on the branch:

- `npm test` — green. **Expect the GUI suite to shrink**: `windowedRows.test.ts`
  (~110 lines) is deleted with the module it tests. State this in the report so a
  falling test count does not read as a deleted safety net.
- `npm run typecheck` — green across all four workspaces. This is what proves the
  `packages/ui` re-export edit landed.
- `npm run build:ui` — green. Second proof of the same.
- `npm run check:manual` — green. Proves `chapters.generated.ts` was regenerated
  after the FRD-011 and `getting-started.md` edits, and that the Ctrl+1…3 row and
  the dropped Backlog rows round-trip.
- **`KANMER_SMOKE=1` electron boot** — the nav shows Board / Standup / Archived
  and no Backlog tab; Ctrl+1/2/3 select those three in order with no gap;
  Ctrl+4 does nothing. This is the ticket's "no gap in the numbering" criterion
  and it has no automated substitute.
- **Ticket criterion "Backlog tickets are reachable and workable from the board
  alone"** — observed in the same boot: the Backlog column renders first and a
  card can be selected and moved out of it.
- **Doc criterion** — `git show` of the four governing-doc diffs quoted in
  `proof`, so "FRD-011 amended, with the tradeoff recorded rather than erased" is
  evidenced rather than asserted.

## Risks / open questions

- **Risk: the `packages/ui` re-export is missed.** It is in a different tree from
  everything else. *Mitigation:* step 4 is its own checklist box and
  `typecheck` + `build:ui` are both on the rail; either fails loudly.
- **Risk: the render ternary is mis-cut** and Standup or Archived renders for the
  wrong view. Nothing type-checks this. *Mitigation:* re-read the whole chain
  after the edit, and the smoke boot clicks all three tabs.
- **Risk: `chapters.generated.ts` regenerated before the doc edits**, so the
  committed artifact is stale in a way `check:manual` catches only if it is
  re-run last. *Mitigation:* step ordering — docs (10) strictly before the
  regen (12), and `check:manual` runs after the rebase too.
- **Risk: the `withdrawn` precedent is written badly** and the next person copies
  a bad pattern. *Mitigation:* stated as an explicit goal in *Governing docs*
  above — keep the original requirements readable, name the withdrawing ticket
  in the frontmatter, put what-is-true-now in a dated amendment section.
- **Risk: rebase conflict with GUI-072 in `styles.css`.** Regions are disjoint
  (`:82-92`/`:602-612`/`:1322-1332` vs `:1789-1839`), so a textual conflict is
  unlikely, but the deletion shifts every line after it. *Mitigation:* step 15 —
  rebase before the PR and re-run the rail after.
- **Open questions: none outstanding.** All four operator-only questions are
  answered in `open-questions`, verbatim, from
  `scratch/operator-answers.md`. Two items remain under *Parked* with reopen
  triggers (bulk triage on the board; a jsdom/testing-library setup for the GUI)
  and are deliberately not this ticket's.
