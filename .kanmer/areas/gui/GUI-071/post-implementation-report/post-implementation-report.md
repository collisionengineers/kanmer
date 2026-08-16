# Post-implementation report — GUI-071

## Summary

The tab strip's badge expression branched only on `archived`, so it was never a
function of the view — it was "the archived count, or the board count", handed
to whichever tab asked. This extracts the view rule into
`renderer/src/lib/views.ts`, keying each view's **label**, the **items it
renders** and **whether it has a badge** into one `Record<View, ViewSpec>`, and
points the tab strip, Ctrl+1…3, `allViewItems`, the `FilterBar` facet set and
the empty states at it. The three inline copies of the rule that survived
GUI-070 are gone. `lib/views.test.ts` asserts badge == rows-the-view-shows
(unfiltered) **across every view**, and FRD-019 gains R5a/R5b/R5c documenting
what a badge means and why it deliberately differs from the board's per-column
counts.

**Read this before reading the diff as a no-op: no printed number changes.**
Post-GUI-070 the two branches of the old expression happen to coincide with the
two surviving counted views' predicates — Board renders every non-archived
ticket and the `else` branch counted exactly that; Archived renders every
archived item and the `archived` branch counted exactly that. The badge was
right by coincidence, not construction: it agreed with the views only because
Backlog, the one view whose predicate differed (and whose badge printed the
whole board, ~5× its rows), had just been deleted. Add a fourth view and the
coincidence ends silently, with no test and no documented meaning to catch it.
What ships is the missing branch, the assertion, and the written-down meaning.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/lib/views.ts` | **added** (~120 lines, mostly comment) | One `VIEWS: Record<View, ViewSpec>` keying `label` + `items(items)` + `counted`, plus `VIEW_IDS`, `viewItemsFor`, `viewCount`, `viewCounts`. Keying the three facts together means a view added later **does not compile** until it says what it contains, so the badge cannot drift from the view again. `import type` only from `@kanmer/core` (AGENTS.md §7). `viewItemsFor(view, items)` deliberately takes **no filter argument** — that is how "a badge ignores filters" is enforced rather than merely asserted. |
| `apps/gui/src/renderer/src/lib/views.test.ts` | **added** (13 tests) | The ticket's verification bullet, reachable only because the rule is now pure — `apps/gui` has no vitest config, no jsdom, no testing-library, and deliberately gains none (Q4). Asserts the criterion **exhaustively over `VIEW_IDS`** rather than per view, so a future view is covered without editing the test. |
| `apps/gui/src/renderer/src/App.tsx` | **modified** (−28/+27) | Local `View`/`VIEW_LABELS` deleted in favour of the import. `allViewItems` → `viewItemsFor(view, items)`. Ctrl+1…9 reads `VIEW_IDS`. Tab strip renders `VIEWS[v].label` and a badge from a `useMemo`'d `Record<View, number|null>` keyed on `items` (computed once per board change, not once per tab per render; dependency list explicit). `FilterBar`'s `items` prop → `allViewItems`, the last inline copy. |
| `docs/functional/frd/FRD-019-gui-shell.md` | **modified** | R5a/R5b/R5c added, plus an acceptance clause and a verified-against-code bullet. See Governing docs. |

### Which duplications of the rule survived GUI-070 — three of four

| Research F3 row | Post-GUI-070 | Disposition |
|---|---|---|
| `allViewItems` (was `:956-962`, now `:957-963`) | survived | now calls `viewItemsFor` |
| inlined badge (was `:1069-1071`, now `:1070-1072`) | survived — **the bug** | now `viewCounts(items)` |
| `FilterBar` items prop (was `:1152`, now `:1153`) | survived | now `allViewItems` |
| `BacklogTable` filter (was `:1186`) | **deleted by GUI-070** | n/a |

Not unified, deliberately: `lib/standup.ts`'s "active for the standup report"
predicate is the same shape answering a different question, separately tested
(parked in `open-questions`).

### Two corrections to the research, both material

- **F4 (corrupted empty states) was resolved by GUI-070, not here.** The
  zero-item-view-shows-no-empty-state bug was specific to the Backlog view,
  whose `allViewItems` was board-wide. For the two surviving views
  `allViewItems` was already correct, so `App.tsx:1211-1235` behaves
  identically before and after. Checked as the named regression site and
  deliberately left unchanged.
- **F6's "archived groups" is wrong in its noun.** Groups are not `Item`s —
  `ItemType` is `ticket | plan | research`, and groups live in their own store
  behind `GroupView`. The asymmetry F6 describes is real and preserved, it just
  concerns archived `plan`/`research` items: Archived counts them because the
  Archived view renders them, Board does not because the board renders no card
  for them. `tsc` caught this by rejecting `type: "group"` in the first draft of
  the test; the fixtures now use `plan`/`research`, and the asymmetry is
  asserted in **both** directions so it is not "tidied" into a false symmetry.

## Governing docs

**`docs/functional/frd/FRD-019-gui-shell.md`** — the ticket's only `ref`.

- **Meets R5.** The view list stays exactly three (Board, Standup, Archived,
  Ctrl+1…3). This moves the list into `lib/views.ts` without altering it;
  verified at runtime that Ctrl+1/2/3 still map correctly, out of order and
  repeated.
- **Modifies R5 — authorized, and named by the operator as required work.**
  The operator answer of 2026-08-16 states it directly: *"Document the
  difference deliberately… FRD-019 R5 lists the views and is currently silent
  on badges — that silence is what made this ambiguous."* Added:
  - **R5a** — what a badge means: everything that lives in that view, ignoring
    the active search and filters. Per view: Board = every non-archived ticket,
    Done included, excluding `plan`/`research`; Archived = every archived item
    whatever its type; Standup = no badge. The asymmetry is stated as
    deliberate.
  - **R5b** — why two numbers in the same header area disagree: the Board's
    per-column counts *do* respond to filters. With a filter on the badge may
    read 152 while the columns sum to 2, and both are correct.
  - **R5c** — where the rule lives (`lib/views.ts`), what derives from it, that
    `viewItemsFor` takes no filter argument, and that `lib/views.test.ts`
    asserts the equality across every view.
  - Acceptance clause for R5a/R5b, and an R5a/b/c bullet in "Verified against
    code".
- **No new ADR.** No architectural decision is introduced. The two decisions
  this rests on were the operator's, and writing them into the FRD is exactly
  where they belong.

## Risks / follow-ups

- **The numbers do not change, so the diff can read as a refactor.** Mitigated
  by saying so plainly here and in the PR body. The defect was a missing
  branch; GUI-070 removed its last visible symptom and left the branch missing.
- **`apps/gui/src/main/kanmerGit.test.ts` flakes** — 1 of 7 failed in the full
  run (`renames locally even with no remote to push to`, *Test timed out in
  5000ms*), 7/7 green rerun alone with `--testTimeout=30000` in 54.7s, cases
  taking 4.2–13.1s against a 5s default. Pre-existing, `src/main/` untouched by
  this diff, has its own ticket. Not chased, not fixed here.
- **`GUI-065` is queued behind this on the same `App.tsx`** — it should rebase
  once this merges. The touched regions are the imports, the Ctrl+N handler
  comment, the `useMemo` block at ~:948, the nav at ~:1058 and the `FilterBar`
  prop at ~:1144.
- **Parked, unchanged:** no DOM test environment for `apps/gui` (its own ticket
  if wanted); `lib/standup.ts`'s predicate not unified; nothing about what the
  Board view *renders* (the count question was never a licence to hide Done).

## Verification hand-off

On merged `main`:

- `npm test` — expect green except the known `kanmerGit.test.ts` flake; if it
  fires, rerun `npx vitest run src/main/kanmerGit.test.ts --testTimeout=30000`
  in `apps/gui` and expect 7/7.
- `npm run typecheck`, `npm run build:ui`, `npm run check:manual`
  (**11** chapters).
- `npx vitest run src/renderer/src/lib/views.test.ts` in `apps/gui` — 13 tests.
- **Observe in the app** (build, then `KANMER_OPEN=<board> npx electron .
  --remote-debugging-port=9222 --user-data-dir=<fresh>`): the Board badge equals
  the sum of the board's column counts with no filter; typing in the search box
  narrows the column counts while both badges hold still; Standup shows no
  badge. **Kill every `electron.exe` PID afterwards** — `child.kill()` does not
  reap the helpers and a stray one blocks `git worktree remove`.
