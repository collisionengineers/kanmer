# Open questions — GUI-071

## ⚠ OPERATOR ONLY — one question still open

- [ ] **Q2. Do the tab counts respond to the active search/filters?**
      They currently do not (they read the whole board), while the Board's
      per-column counts do (they are computed from the filtered set) —
      `Board.tsx:145-150`. So with a filter on, the tab says 131 and the
      columns sum to fewer, in the same header area.
      **(a) Tab count = total in that view, ignoring filters** (a tab badge
      describes the tab; a filter is temporary). The column counts being
      filtered then becomes a documented, deliberate difference.
      **(b) Tab count = currently visible rows.** Matches "the count equals
      the rows the view shows" literally, including under a filter, but the
      badge flickers as you type in the search box.
      Research leans (a). **This must be settled before planning**: the
      ticket's verification bullet "the count equals the number of rows the
      view shows" is ambiguous under an active filter, and the test that
      bullet asks for cannot be written until the meaning is fixed. The
      2026-08-16 operator decision settled *which items* Board counts; it is
      silent on this.

## Resolved

- [x] **Q1. Does the Board tab count include Done?**
      **Yes — settled by operator decision, 2026-08-16** (`scratch/notes.md`),
      quoted verbatim in `research`:
      > **All non-archived tickets**, not "not-done". Board 131, Backlog 24.
      Board's number was already correct; only Backlog's was wrong. The fix
      does not change what Board counts and does not hide the Done column.
      This meaning goes into FRD-019 R5 as the documented definition.
- [x] **Q3. Landing order relative to GUI-070.**
      **Settled by the same decision: GUI-071 lands _after_ GUI-070**, which
      deletes the Backlog tab. The plan therefore writes **no `backlog` case**
      into the view predicate — by then `View` is
      `"ticket" | "standup" | "archived"`. This matches the independent
      file-overlap finding (both tickets edit `App.tsx:1059-1076`, so they
      cannot run in parallel). GUI-069 is file-disjoint and unconstrained.
- [x] **Q4. Can the ticket's "asserted in a test" bullet be met as-is?**
      No — not against the JSX. `apps/gui` has **no component tests, no
      `vitest.config`, no jsdom, no `@testing-library/react`**; vitest runs in
      the default node environment and every renderer test is a pure-module
      test under `lib/`. **Resolution:** the view predicate is extracted into
      `lib/` and the test asserts against the pure function. Adding a DOM test
      environment is explicitly out of scope.
- [x] **Q5. Should the Archived count keep counting non-ticket items?**
      Yes. The Archived view renders `items.filter((i) => i.archived)` —
      archived groups included — so its count already matches its contents.
      The asymmetry with the Board tab (which excludes non-tickets) is correct
      per view and must be preserved, not normalised away.
- [x] **Q6. Is the count's meaning documented anywhere today?**
      No. FRD-019 R5 lists the four views and says nothing about badges or
      counts; nothing in `/docs/` defines them. FRD-019 R5 is where Q1's
      answer (and Q2's, once given) gets written down — the ticket is explicit
      that the undocumented meaning is what let "111" survive.

## Parked (explicitly deferred)

- Changing what the Board view counts or renders, including hiding or
  collapsing the Done column — closed by the operator decision.
- Unifying `lib/standup.ts:88`'s "active tickets" predicate with the view
  predicate. Same shape, different question, separately tested.
- Whether `FilterBar`'s facet options should narrow to the view's item set
  (`App.tsx:1152`) — a visible consequence if the predicate is shared
  wholesale; flagged in `files` as a ripple to decide during planning.
