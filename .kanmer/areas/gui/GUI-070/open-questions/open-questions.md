# Open questions — GUI-070

**The four unticked questions below are OPERATOR-ONLY.** They are not things an
implementer can decide from the code: three of them change documents that govern
other tickets, and one sets a repo convention that does not exist yet. They are
raised **now**, at research time, per the skill — not deferred to planning.

While any of them is unticked, `questions-resolved` is unmet and GUI-070 cannot
leave Preparing. That is the intended behaviour, not an obstruction.

The scope-setting fork the ticket demanded ("pick one deliberately") is **already
answered** by the operator in `scratch/notes.md` — option 1, accept the loss — and
is not reopened here.

---

## Operator-only — these block the ticket

- [ ] **Who amends `FRD-007-fixed-six-stage-board.md` B4 — GUI-069 or GUI-070?**
      B4 currently reads "The kanban renders Preparing → Done; Backlog renders as
      the dedicated list view (FRD-011)." Both halves reverse: GUI-069 makes the
      kanban render Backlog → Done, GUI-070 kills the list view. Both tickets are
      in Preparing right now, so whichever plan claims it, the other must not,
      or two branches edit the same line. *Recommendation:* GUI-069 amends the
      first half when it lands (it is the change B4 describes); GUI-070 amends the
      second half. If the operator prefers one owner, GUI-070 is the safer single
      owner because it lands second and can state the finished position.

- [ ] **Does `PRD-001-kanmer-v3.md` get amended, and by this ticket?**
      The PRD states the deleted design in three places — `:16` problem 6 ("a
      194-card Backlog column is a list problem wearing a kanban costume"), `:25`
      ("a backlog view built for volume"), `:30` ("the backlog is triaged in the
      list view"). The ticket body only mandates FRD-011. A PRD is a product-level
      why, and reversing a stated v3 goal is a product call, not an implementer's.
      *Recommendation:* amend, minimally — a dated note under problem 6 saying the
      list view was built, shipped, and withdrawn in favour of a Backlog column,
      with the bulk-triage loss recorded. Leaving it is the option that produces
      the "governing docs describe a feature that does not exist" state this
      ticket exists to avoid.

- [ ] **What `status` does an amended-into-obsolescence FRD carry?**
      Every FRD in `docs/functional/frd/` is `status: draft` or `status: approved`;
      there is no `superseded`/`withdrawn` precedent, and
      `FRD-014-doc-type-guidance.md:15` only fixes the convention for ADRs ("one
      decision, superseded never edited"). FRD-011 must stay on disk regardless —
      `scripts/build-manual.mjs:64` throws on a missing curated FRD. *Recommendation:*
      `status: withdrawn`, plus an `## Amendment (GUI-070)` section that reverses
      R5, marks R1/R3/R4/R6 withdrawn, and records that bulk triage was weighed
      and dropped rather than relocated. This sets a precedent for the whole
      `docs/` tree, which is why it is asked rather than assumed.

- [ ] **Confirm the sequence GUI-069 → GUI-070 → GUI-071, and accept that
      GUI-071's first verification criterion dies with this ticket.**
      GUI-070 and GUI-071 both edit `App.tsx:1058-1074`: this ticket removes a key
      from the `VIEW_LABELS` object the tab `.map()` iterates, GUI-071 rewrites the
      count expression *inside* that same `.map()`. Worked in parallel they
      conflict. Worked GUI-071-first, GUI-071 writes a per-view count for a view
      this ticket then deletes. Landing GUI-070 first voids GUI-071's criterion
      "Backlog tab count equals the number of rows the Backlog view shows"
      (`GUI-071.md:64`) — GUI-071 itself anticipates this at `:59-60`, but the
      criterion is still written and someone must strike it. *Recommendation:*
      GUI-069 → GUI-070 → GUI-071, and edit GUI-071's verification list to drop
      that line when this ticket merges.

---

## Answered here, with the default taken (no operator time needed)

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
