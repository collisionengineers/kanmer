# Open questions — GUI-071

## ⚠ OPERATOR ONLY — these are product decisions, not code questions

The plan must not guess these. Both define what a number in the UI *means*;
research can lay out the options but cannot choose. The ticket itself says the
meaning has to be decided explicitly and written down, because "technically
true" is what let the bug survive.

- [ ] **Q1. Does the Board tab count include Done?**
      Today it is every non-archived ticket: **142, of which 110 are Done**
      (~77%). Three coherent answers, pick one:
      **(a) Count what the view shows (status quo, 142).** Honest — the Done
      column *is* rendered — but the number is dominated by finished work and
      tells you nothing about what is in flight.
      **(b) Count unfinished only (`status !== UI_LAST_STAGE`, 32).** The
      number a person actually wants, but it no longer equals the rows on
      screen, which is the same broken promise pointing the other way.
      **(c) Count unfinished *and* stop rendering Done by default** — the only
      option where "count = contents" and the number is useful. Bigger: it
      changes what the Board view shows, and would need its own ticket.
      Research recommends (a) or (c); (b) buys a useful number by breaking the
      invariant this ticket exists to restore. Whichever is chosen goes into
      FRD-019 R5 verbatim.

- [ ] **Q2. Do the tab counts respond to the active search/filters?**
      They currently do not (they read the whole board), while the Board's
      per-column counts do (they are computed from the filtered set) —
      `Board.tsx:145-150`. So with a filter on, the tab says 142 and the
      columns sum to fewer, in the same header area.
      **(a) Tab count = total in that view, ignoring filters** (a tab badge
      describes the tab, and a filter is temporary). Then the column counts
      being filtered is a documented, deliberate difference.
      **(b) Tab count = currently visible rows.** Matches "the count equals
      the rows the view shows" literally, including under a filter, but the
      badge flickers as you type in the search box.
      Research leans (a). It must be stated either way, because the verification
      bullet "Backlog tab count equals the number of rows the Backlog view
      shows" is ambiguous under a filter and cannot be tested until this is
      settled.

## Team / sequencing

- [ ] **Q3. Confirm the landing order relative to GUI-070.**
      GUI-070 and GUI-071 both edit `App.tsx:1059-1076` and will conflict if
      worked in parallel. Research recommends **GUI-069 → GUI-070 → GUI-071**,
      so GUI-071 never writes a `backlog` view branch that GUI-070 then
      deletes, and writes the final view list into FRD-019 once. If the
      operator wants GUI-071 first instead, the plan must include a `backlog`
      case and accept it is temporary. Needs a yes/no, not a guess.

## Resolved during research

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
      counts; nothing in `/docs/` defines them. FRD-019 R5 is where the answers
      to Q1 and Q2 get written.

## Parked (explicitly deferred)

- Hiding or collapsing the Done column on the board (only in play if Q1
  answers (c) — then it becomes its own ticket, not a silent extra).
- Unifying `lib/standup.ts:88`'s "active tickets" predicate with the view
  predicate. Same shape, different question, separately tested.
- Whether `FilterBar`'s facet options should narrow to the view's item set
  (`App.tsx:1152`) — a visible consequence if the predicate is shared
  wholesale; flagged in `files` as a ripple to decide during planning.
