# Open questions — GUI-071

## None open. All resolved.

## Resolved

- [x] **Q2. Do the tab counts respond to the active search/filters?**
      **No — answered by the operator, 2026-08-16** (`scratch/operator-answers.md`),
      quoted verbatim:
      > **Q2 — do tab counts respond to the active search/filters?
      > ANSWERED: NO. A tab's count ignores filters. The tab describes the tab.**
      >
      > The operator's reasoning, as selected: a tab badge says how much lives in
      > that view; a filter is a temporary lens. So with a filter active the Board
      > tab may read 131 while the columns beneath it sum to 6 — and that is
      > correct, not a bug.

      Option (a), as research leaned. Two consequences, both carried in the plan
      as required work:
      1. **The difference is documented deliberately** in FRD-019 R5 (plan step 6,
         Governing-docs section). The Board's per-column counts *do* respond to
         filters (`Board.tsx:145-150`); two numbers in the same header area
         answering different questions read as a defect unless the FRD says why.
         R5 currently lists the views and is silent on badges — that silence is
         what made this ambiguous.
      2. **The verification criterion is now writable**: the count equals the rows
         the view shows **with no filter applied**. The extracted
         `viewItemsFor(view, items)` takes no filter argument, so the badge is
         structurally incapable of seeing one — the contract is enforced by the
         signature, not just asserted.
- [x] **Q1. Does the Board tab count include Done?**
      **Yes — settled by operator decision, 2026-08-16** (`scratch/notes.md`),
      quoted verbatim in `research`:
      > **All non-archived tickets**, not "not-done". Board 131, Backlog 24.
      Board's number was already correct; only Backlog's was wrong. The fix
      does not change what Board counts and does not hide the Done column.
      This meaning goes into FRD-019 R5 as the documented definition.
      **Restated by the operator after GUI-070 as "still binding, do not
      re-open".**
- [x] **Q3. Landing order relative to GUI-070.**
      **Settled by the same decision: GUI-071 lands _after_ GUI-070**, which
      deletes the Backlog tab. **This has now happened** — GUI-070 merged as
      `2f06713` (PR #43). The plan therefore writes **no `backlog` case** into
      the view predicate; `View` is `"ticket" | "standup" | "archived"`.
- [x] **Q4. Can the ticket's "asserted in a test" bullet be met as-is?**
      No — not against the JSX. `apps/gui` has **no component tests, no
      `vitest.config`, no jsdom, no `@testing-library/react`**; vitest runs in
      the default node environment and every renderer test is a pure-module
      test under `lib/`. **Resolution:** the view predicate is extracted into
      `lib/views.ts` and the test asserts against the pure function. Adding a
      DOM test environment is explicitly out of scope, and the operator
      repeated that instruction verbatim.
- [x] **Q5. Should the Archived count keep counting non-ticket items?**
      Yes. The Archived view renders `items.filter((i) => i.archived)` —
      archived groups included — so its count already matches its contents.
      The asymmetry with the Board tab (which excludes non-tickets) is correct
      per view and must be preserved, not normalised away. The new test asserts
      the asymmetry in both directions so it cannot be "tidied" later.
- [x] **Q6. Is the count's meaning documented anywhere today?**
      No. FRD-019 R5 lists the views and says nothing about badges or counts;
      nothing in `/docs/` defines them. FRD-019 R5 is where Q1's and Q2's
      answers get written down — the ticket is explicit that the undocumented
      meaning is what let "111" survive.

## Struck by GUI-070

- The ticket's first verification criterion, *"Backlog tab count equals the
  number of rows the Backlog view shows"*, describes a view that no longer
  exists. GUI-070 (`2f06713`) deleted the Backlog view, its tab, its render
  branch, `BacklogTable.tsx` and `lib/windowedRows.ts`. Recorded as struck on
  the ticket body; nothing to answer.

## Parked (explicitly deferred)

- Changing what the Board view counts or renders, including hiding or
  collapsing the Done column — closed by the operator decision.
- Unifying `lib/standup.ts:88`'s "active tickets" predicate with the view
  predicate. Same shape, different question, separately tested.
- Whether `FilterBar`'s facet options should narrow to the view's item set
  (`App.tsx:1153`) — **moot in practice.** `FilterBar` renders only when
  `view === "ticket"`, where its inline expression and the Board view's item
  set are identical, so collapsing it to `allViewItems` (plan step 4) narrows
  nothing. If a future view ever shows a FilterBar, the question returns.
- Adding jsdom + `@testing-library/react` so JSX can be tested directly
  (Q4) — its own ticket, if anyone wants it.
