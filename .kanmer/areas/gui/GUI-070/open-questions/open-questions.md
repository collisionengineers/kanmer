# Open questions — GUI-070

**All four operator-only questions were answered on 2026-08-16.** The answers are
recorded verbatim below, beneath the question each settles, and in full in
`scratch/operator-answers.md`. They are **settled and not reopened** — the plan is
written around them.

The scope-setting fork the ticket demanded ("pick one deliberately") was answered
earlier by the operator in `scratch/notes.md` — **option 1, accept the loss** —
and is likewise not reopened here.

---

## Operator-only — answered 2026-08-16

- [x] **Who amends `FRD-007-fixed-six-stage-board.md` B4 — GUI-069 or GUI-070?**
      B4 reads "The kanban renders Preparing → Done; Backlog renders as the
      dedicated list view (FRD-011)." Both halves reverse.

      **Answer — SCHEDULER: GUI-070 owns it, entirely.** Verbatim:

      > GUI-069 amends no FRD. B4 is one sentence whose both halves reverse, so
      > splitting it means two branches editing the same line. You land second and
      > can state the finished position in one edit. You therefore own **FRD-007
      > B4 and every FRD-011 edit**. GUI-069's plan names you as the ticket that
      > corrects the temporary falsehood — make sure you actually do.

      Consequence, stated plainly: **as of `488797d` (GUI-069 merged), FRD-007 B4
      and FRD-011 R5 are both false on main.** This ticket is the only thing that
      fixes them.

- [x] **Does `PRD-001-kanmer-v3.md` get amended, and by this ticket?**

      **Answer — OPERATOR: YES.** A **dated note under problem 6** ("a 194-card
      Backlog column is a list problem wearing a kanban costume"), recording that
      the list view was built, shipped and withdrawn in favour of a Backlog
      column, **with the bulk-triage loss named**. The PRD states the deleted
      design in three places (`:16`, `:25`, `:30`); the dated note is the minimum,
      and a reader arriving at *any* of the three must reach it — so `:25` and
      `:30` get inline pointers to the note rather than duplicated prose.

- [x] **What `status` does an amended-into-obsolescence FRD carry?**

      **Answer — OPERATOR: `status: withdrawn`, plus an amendment section.** The
      operator chose this knowing there is **no prior `withdrawn` or `superseded`
      FRD in this repo**, i.e. deliberately setting the precedent. Verbatim: *"So
      write it as a precedent someone will copy."* Concretely:

      - `docs/functional/frd/FRD-011-backlog-list-view.md` → `status: withdrawn`,
        plus an `## Amendment (GUI-070)` section that **reverses R5** and marks
        **R1/R3/R4/R6 withdrawn**.
      - The amendment must **record that bulk triage was weighed and dropped, not
        relocated.** Multi-select and bulk move/archive/add-to-group go away with
        `BacklogTable`, and GUI-069's Backlog column is deliberately plain. Do not
        write it as though the capability moved somewhere.
      - **FRD-011 stays on disk.** `scripts/build-manual.mjs:64` throws if a
        curated FRD is missing. Amend in place; never delete. Its **Overview is
        lead prose** compiled into the committed `chapters.generated.ts`, so the
        manual must be regenerated and committed or `npm run check:manual` fails.

- [x] **Confirm the sequence GUI-069 → GUI-070 → GUI-071, and accept that
      GUI-071's first verification criterion dies with this ticket.**

      **Answer — SCHEDULER: confirmed, GUI-069 → GUI-070 → GUI-071.** Verbatim:

      > You must strike GUI-071's first verification criterion ("Backlog tab count
      > equals the number of rows the Backlog view shows") when this merges — it
      > describes a view you deleted. Edit GUI-071's verification list directly;
      > do not leave it for someone to notice.

      It is therefore a step in this ticket's plan and a box on its checklist, not
      a note for a future reader.

---

## Answered here, with the default taken (no operator time needed)

Confirmed by the operator as "defaults already taken and not re-opened".

- [x] **Remove the `["backlog", "The Backlog list", …]` entry from `FROM_FRD` in
      `scripts/build-manual.mjs`?** — **Yes.** Kept, the in-app manual regenerates
      a chapter whose lead prose describes a view the user cannot open; the
      amended FRD's prose would make it worse, not better. The chapter is not a
      deep-link target (`manual.test.ts:66-73` lists `profiles, stages, documents,
      proof, shortcuts, troubleshooting` — no `backlog`), so nothing breaks.

- [x] **Relabel the view shortcut `Ctrl+1…4` → `Ctrl+1…3`?** — **Yes**, and drop
      the three Backlog-context rows (`shortcuts.ts:32-34`), since arrow/Space/Enter
      row semantics existed only inside `BacklogTable`. The handler
      (`App.tsx:929-940`) derives its targets from `VIEW_LABELS`, so the mapping
      renumbers itself; the label is hand-written and does not.

- [x] **Fix the stale `FRD-011 R4` citations in `FilterBar.tsx:5` and
      `App.tsx:1726`?** — **Yes**, comment-only. The horizon/group chips survive
      (they live in the FilterBar, which renders only for the board view), so the
      citation should point at `FRD-001 G8` alone rather than at a withdrawn
      requirement.

- [x] **Is any migration needed for users whose last-used view was Backlog?** —
      **No.** `SavedTabState` lives in a `useRef<Map>` (`App.tsx:94`) and is never
      persisted; `main/settings.ts` and `shared/ipc.ts` have no view preference.
      No fallback guard should be added.

## Parked (explicitly deferred)

- [ ] **Should the board's Backlog column ever regain bulk triage (multi-select,
      bulk move/archive/group)?** Safe to defer: the operator has explicitly
      accepted the loss for now, and re-adding it is additive work on a column
      that must first exist. Reopened by a user hitting the loss in practice —
      at which point it is a new ticket against the board, not a reinstatement of
      the view, and `BacklogTable.tsx` is recoverable from git history.

- [ ] **Should `apps/gui` gain a jsdom/testing-library setup so the nav and the
      keyboard handler can be tested?** Safe to defer: it is a test-infrastructure
      ticket, not this deletion, and `shortcuts.ts:1-13` already records the
      handler-coverage gap on the record. Reopened the next time a view/shortcut
      change ships broken because only a manual boot check stood behind it.
