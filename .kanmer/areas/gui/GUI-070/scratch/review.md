# Review — GUI-070, PR #43

**I am both author and reviewer of this change. This is not an independent
review and should not be read as one.** What follows is a self-check against the
plan, the report and the diff, written to be falsifiable rather than
reassuring — the disposition section names the two things I chose *not* to do
and why, so a later reader can disagree with the reasoning rather than discover
the omission.

Gate self-check first (`get_doc_gates GUI-070`, profile `fix`): the only gated
boundary left is `enter-done` (needs `proof`, `questions-resolved`).
`questions-resolved` is satisfied — all four operator questions are ticked with
the answers recorded verbatim. Review → Verifying is ungated, so the move after
merge will not fail into a gate.

## Changes — what the diff actually does

17 files, +152 / −573. In my own words, not the report's:

**The view is removed at four points, and all four are present.** `App.tsx`
loses the import, the union member, the label map entry, and the whole
`view === "backlog"` ternary arm. I re-read the resulting chain: `ticket` →
Board, `standup` → Standup, else → ArchivedList. That is the pre-existing shape
minus the middle arm, with no arm reassigned — the specific mis-cut the plan
flagged as the medium risk did not happen. The four inline handlers went with the
arm; nothing else called them, so no unreachable async code is left behind.

**Three files are deleted outright** (`BacklogTable.tsx` 257, `windowedRows.ts`
79, `windowedRows.test.ts` 111). I re-ran the consumer grep on this branch: no
source file outside `docs/` mentions either symbol. The two remaining hits are
FRD-011's amendment (deliberate — it names the recovery path) and
`docs/plans/kanmer-v3/phase-5-.../plan.md` (see disposition).

**`packages/ui/src/index.ts` loses two lines.** This is the edit the whole
change most plausibly ships broken without, and it is not verifiable by reading
`apps/gui/`. `npm run typecheck` (all four workspaces) and `npm run build:ui`
both pass, which is the actual check.

**`styles.css` is a pure deletion.** I checked the diff for added lines
specifically: there are none — 52 removed, 0 added. That rules out an accidental
edit inside a neighbouring rule, and confirms the shared `.check` / `.hint` /
`.banner.warn` / `.spacer` rules the `files` document warned about were not
touched.

**`shortcuts.ts` loses one label and three rows.** `manual.test.ts` brackets
this table with a strict "nothing extra" row diff, so a formatting slip fails the
suite; it passes.

**Docs are the larger half:** FRD-011 +108 lines (withdrawal and amendment),
PRD-001 +23 (dated note + two pointers), FRD-007 B4 rewritten, FRD-019 R5
rewritten, FRD-001 three citation repoints, `getting-started.md` one paragraph.

## Report against diff

Checked line by line. The report's Changes table lists **all 17** files with a
rationale each, and no file in the diff is missing from it. Spot-checks where a
report most often overstates:

- Claims the `.check` / `.hint` / `.banner.warn` / `.spacer` rules were left
  alone — verified by the zero added lines in the CSS diff.
- Claims the `manual.test.ts` assertion was **not weakened** — verified: it still
  iterates every view and requires the label to contain each; only the view list
  shrank from four to three.
- Claims the deleted suite was **13 cases, measured not estimated** — verified:
  the file was restored from `HEAD` and run standalone (13 passed) before being
  removed again. The "22 files / 230 tests → 21 / 217" arithmetic holds against
  the observed 21/217.
- Claims `release-notes.md` was deliberately untouched — verified, not in the
  diff.

No overstatement found. One thing the report gets right that is worth
underlining: it presents the shrinking test count as a deliberate consequence
with a measurement behind it, which is exactly the thing a reviewer would
otherwise have to reconstruct.

## Governing docs — the plan's section against the change

The plan promised five doc edits and two citation repoints. All seven are in the
diff, and each is authorized by an answer recorded verbatim in `open-questions`:

| Promised | In the diff | Authorization |
|---|---|---|
| FRD-011 `status: withdrawn` + amendment reversing R5, withdrawing R1/R3/R4/R6 | yes | ticket body + operator ("`status: withdrawn`, plus an amendment section") |
| Amendment says bulk triage was **weighed and dropped, not relocated** | yes — its own subsection, stating it did not move, naming what died, and giving the reopen path as a new ticket rather than a reinstatement | operator, binding |
| FRD-007 B4, **both halves**, single owner | yes — one sentence, states the finished position | scheduler ("GUI-070 owns it, entirely") |
| PRD-001 dated note under problem 6, reachable from `:16`, `:25`, `:30` | yes — note under problem 6; `:25` and `:30` carry inline pointers to it | operator ("YES") |
| FRD-019 R5 | yes | plan |
| FRD-001 G8 + criterion 4 + Related | yes | plan (citation repoint only) |
| `FilterBar.tsx:5`, `App.tsx:1722` citations | yes | default taken at research time |

**The claim most worth checking, because it is the one the operator was most
specific about:** does the amendment read as though the capability moved? It does
not. It says "It did not move. It is gone.", enumerates multi-select, bulk
move/archive/add-to-group and the per-ticket failure report, states that
GUI-069's column is deliberately plain, and frames the trade explicitly. PRD-001
says the same in product terms ("problem 6 is therefore *accepted* rather than
solved") and FRD-007 B4 carries the same clause. Three documents, consistent, no
euphemism.

**FRD-007 B4 and FRD-011 R5 were false on `main`** between `488797d` and this
merge. That was known and accepted (GUI-069 amended no FRD by design); this PR is
what closes the window, which is why the single-owner point mattered.

## Comments

1. **[non-blocking] `docs/plans/kanmer-v3/phase-5-gui-groups-backlog-help/plan.md`
   still describes building `BacklogTable.tsx`.** It is a dated v3 delivery plan
   for work that was in fact done — the same category as
   `apps/gui/release-notes.md:155`, which the research explicitly ruled
   out of scope as history. Amending it would falsify a record of what was
   planned and built.
2. **[non-blocking] `FRD-019`'s "Verified against code — Phase 0.2" block still
   mentions the Backlog view.** Same reasoning: it is a dated audit snapshot, and
   its surrounding text already describes a state ("Board currently renders
   Backlog→Done (seven stages)") that has not been true for some time. Editing
   half of a stale snapshot makes it *less* legible, not more.
3. **[non-blocking] No automated coverage for the nav or the Ctrl+N handler.**
   Pre-existing, recorded in `shortcuts.ts:1-13`. Compensated here by driving the
   running app over CDP rather than by reading the derivation — Ctrl+1/2/3 map to
   Board/Standup/Archived and **Ctrl+4 is inert**, observed, not inferred.
4. **[non-blocking] Fresh-worktree ordering.** `npm test` cannot resolve
   `@kanmer/core` until something builds `packages/core/dist`. Environmental, not
   introduced here; captured in the report's verification hand-off so
   `kanmer-verify` does not read it as a failure.
5. **[non-blocking] GUI-071's first verification criterion is now void.**
   Struck directly on GUI-071 as part of this ticket rather than left to be
   noticed.

Nothing blocking. No PR Review tickets filed.

## Disposition

| # | Point | Disposition |
|---|---|---|
| 1 | `docs/plans/kanmer-v3/…/plan.md` mentions BacklogTable | **won't-do** — historical delivery plan, same class as release notes; the research ruled history out of scope |
| 2 | FRD-019 Phase 0.2 audit snapshot | **won't-do** — dated snapshot, already stale in its own terms; partial edits make it less readable |
| 3 | No test over nav / Ctrl+N handler | **filed-as-ticket** — already parked in `open-questions` (jsdom/testing-library setup) with a reopen trigger; verified at runtime for this change |
| 4 | build-before-test in a fresh worktree | **fixed-in-PR** (documented) — called out in the report's hand-off and the checklist notes |
| 5 | GUI-071's stale criterion | **fixed-in-PR scope** — struck on GUI-071 by this ticket |

## Verdict

**PASS.** What was actually checked: the full diff of all 17 files; the render
ternary re-read after the cut; the consumer grep re-run on the branch; the CSS
diff checked for added lines; the report's four most falsifiable claims
spot-checked against the tree; the plan's Governing-docs table matched
one-for-one against the diff and each entry against its recorded authorization;
and the rail — `npm run build:ui`, `npm test` (21 files / 217 tests), `npm run
typecheck` (four workspaces), `npm run check:manual` (up to date, 11 chapters) —
plus a `KANMER_SMOKE=1` boot and a CDP-driven runtime check of the nav, the
board columns, the Ctrl+1…3 renumbering, Ctrl+4's inertness, and a Backlog card
selecting and opening its editor.

Merging under the standing delegation, then Review → Verifying.
