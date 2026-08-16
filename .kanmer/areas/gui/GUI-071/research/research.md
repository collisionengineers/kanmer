# Research — GUI-071: the view tab counts are wrong

Read-only investigation. No code changed, no branch, no worktree.
Working tree at time of research: branch `main`, HEAD `14f2715`, with the
Backlog view **still present** (GUI-070 has not landed).

## The question

Why does every view tab show the same number, and what should each tab's
number actually mean?

## Findings

### F1. The count expression is a constant in the tab it is rendered for

`apps/gui/src/renderer/src/App.tsx:1059-1076` — the nav maps over
`Object.keys(VIEW_LABELS)` and renders, for every tab except Standup:

```tsx
{v === "archived"
  ? items.filter((i) => i.archived).length
  : items.filter((i) => i.type === "ticket" && !i.archived).length}
```

`v` appears only in the archived test. Every non-archived tab therefore gets
the identical expression `all non-archived tickets`. Board and Backlog print
the same number by construction; it is not a filter that drifted, it is a
missing branch.

### F2. It could not have been written per-view without a refactor

The per-view predicate does exist — `allViewItems`
(`App.tsx:956-962`) — but it is a `useMemo` keyed on `view`, the **active**
view. It answers "what is in the view I am looking at", not "what is in tab
`v`". A tab strip needs the predicate as a *function of the view*, evaluated
once per tab. That function does not exist anywhere; the memo body is its
only expression of the rule, and it is not reusable in that shape. This is
why the count fell back to a board-wide expression.

### F3. The view→items rule is duplicated four times, and one copy is wrong

| Where | Expression | Purpose |
|---|---|---|
| `App.tsx:956-962` | archived → `i.archived`; else → `ticket && !archived` | `allViewItems`, feeds filters + empty states |
| `App.tsx:1069-1071` | same, inlined | the tab counts (the bug) |
| `App.tsx:1152` | `ticket && !archived` | items handed to `FilterBar` for its facets |
| `App.tsx:1186` | `viewItems.filter(status === "backlog" && !archived)` | what `BacklogTable` actually renders |

`allViewItems` is itself **wrong for the Backlog view**: it returns all
non-archived tickets, and the `status === "backlog"` restriction is applied
much later, at the render site, *after* `applyFilters`. So even "reuse
`allViewItems`" would not give the Backlog tab 15 — the backlog restriction
has to move up into the view predicate. This is the actual structural defect
the ticket's "one source" instruction is pointing at.

### F4. The wrong predicate also corrupts the empty states

`App.tsx:1241-1263` branches on `allViewItems.length` and
`viewItems.length`. Because `allViewItems` in the Backlog view is "every
non-archived ticket", a board with zero backlog tickets shows **no empty
state at all** in the Backlog view (the `=== 0` test never fires), and the
"No matches for the current filters" state can fire when filters are not the
reason. Fixing F3 properly fixes these for free — they are the same bug, and
they are the evidence that the count and the contents are not the only two
consumers that need one source.

### F5. Counts ignore search and filters; the board's column counts do not

The tab counts read `items` (the whole board). `Board` receives `viewItems`
(post-`applyFilters`) and prints per-column counts from it
(`Board.tsx:145-150`, `items.filter((i) => i.status === s.id).length`). With
any filter active, the tab says one number and the visible columns sum to a
smaller one. Whichever meaning is chosen, the two must be stated together or
the "count = what is behind the tab" promise breaks the other way.

### F6. Archived counts non-tickets; Board does not — and that is correct

The archived branch omits `type === "ticket"`, so archived groups are
counted. The Archived view's own predicate (`App.tsx:959`) also omits it, so
the count matches the contents. The asymmetry with the Board tab is
consistent with each view's contents and must be preserved, not "tidied".

### F7. Current board data, verified

Counting frontmatter in `.worktrees/kanmer/.kanmer/areas`: **15 backlog, 18
preparing, 110 done**, 1 archived. The ticket body was written when the split
was 6/111; the shape is unchanged and worse — Done is ~77% of the board
total. Both tabs today print the same ~142.

### F8. There are no component tests in this app, at all

`apps/gui` has no `vitest.config.*` and no test `environment` set in
`electron.vite.config.ts`, so vitest runs in the default **node**
environment. `devDependencies` contain no `jsdom`, no
`@testing-library/react`. Every existing renderer test is a pure-module test
next to its module in `src/renderer/src/lib/` (`board.test.ts`,
`standup.test.ts`, `windowedRows.test.ts`, …).

**Implication for the ticket's verification bullet** ("asserted in a test so
the next filter change cannot silently break it"): the assertion is only
reachable if the view predicate is extracted into a pure module in
`src/renderer/src/lib/` and tested there. Testing the JSX in place would
require adding jsdom + a React testing library to the app — a far larger
change than this fix, and one nobody has needed yet. Extraction is both the
fix for F3 and the only affordable route to the test.

### F9. The meaning of the counts is undocumented

`docs/functional/frd/FRD-019-gui-shell.md` R5 lists the four views and says
nothing about badges or counts. Nothing anywhere in `/docs/` defines what a
tab count means. The ticket is right that "111 is technically true" is what
let this survive; there is no written statement it could have contradicted.
FRD-019 R5 is the place to write the answer down.

## What this implies for GUI-071

1. The fix is not "add a branch to line 1069". It is: **derive the view's
   item set from one pure function of `(view, items)`**, then feed the tab
   count, `allViewItems`, `FilterBar`, the `BacklogTable` filter and the
   empty states from it. Anything less leaves F3 and F4 in place.
2. `src/renderer/src/lib/board.ts` is the established home for exactly this
   kind of shared, testable board rule (it already holds `blockedIds`,
   `columnCards`), or a sibling `lib/views.ts`. Either satisfies F8.
3. The Board tab's meaning (include Done or not) and the filters question
   (F5) are **decisions, not findings** — see `open-questions`. Both must be
   settled before the plan, and both must be written into FRD-019.

## Assumptions about GUI-069 and GUI-070

Stated explicitly because all three touch the same machinery:

- **This research assumes neither has landed.** It describes the tree at
  `14f2715`, where `View = "ticket" | "backlog" | "standup" | "archived"`
  and the Backlog view still renders `BacklogTable`.
- **GUI-069** (Backlog becomes the first board column) touches only
  `Board.tsx` (`mergeColumns` at :29-33, the `STAGES.filter` at :115-120).
  It does not touch the tab strip and does not change the Board view's item
  set — backlog tickets are already inside `allViewItems`. **GUI-069 changes
  nothing in this ticket's findings** and can land before, after or
  concurrently.
- **GUI-070** (delete the Backlog view) removes the `backlog` key from
  `View`/`VIEW_LABELS` (`App.tsx:49-56`) and the `BacklogTable` branch
  (`App.tsx:1184-1212`). That **deletes the tab whose count is most visibly
  wrong** but not the defect: Board would still print a Done-dominated total
  and the shared-expression shape would remain. It also removes the fourth
  duplicate (F3 row 4) and, with it, the F4 empty-state bug for the backlog
  view specifically.
- **Sequencing:** GUI-070 and GUI-071 both edit the same JSX region of
  `App.tsx` (the nav at :1059-1076 sits 3 lines below the `VIEW_LABELS` map
  GUI-070 rewrites) and both may edit `allViewItems` at :956-962. They will
  textually conflict if run in parallel. **Recommended order: GUI-069 →
  GUI-070 → GUI-071.** Running GUI-071 last means it never writes a
  `backlog` branch that GUI-070 immediately deletes, and it gets to write the
  final view list into FRD-019 once.
  If GUI-071 must go first, the plan must include a `backlog` case in the
  view predicate and accept that GUI-070 will delete it.
