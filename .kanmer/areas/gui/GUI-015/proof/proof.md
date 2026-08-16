# Proof

PR [#23](https://github.com/collisionengineers/kanmer/pull/23), merged
(`841c5bc`). Verified on the merged base.

## The property that makes it a virtualized list

The ticket asks for "a 200-row fixture scrolls without jank". Jank is a
rendering property this repo cannot test. What is provable is the property jank
would violate, and it is asserted three orders of magnitude past the fixture:

- **rendered row count is constant** at 200, 1,000 and 10,000 rows, and ≤ 30
- **scroll height is exact** — `padTop + rendered + padBottom` equals
  `count × rowHeight` at every sampled offset at every size. A drifting total
  means the scrollbar lies and the list jumps under the cursor.
- a tightening filter that leaves the viewport scrolled past the end still
  renders rows, rather than nothing

Weaker than "no jank", and labelled as such rather than declared equivalent.

## Checks

| Check | Result |
|---|---|
| `windowedRows` unit tests | **13** |
| gui suite | 163 → **176** |
| core suite | 132 |
| Board no longer builds a Backlog column | `Board.tsx:119` filters it out |
| `@kanmer/ui` barrel | exports `BacklogTable` + its props |
| typecheck / GUI build / boot smoke | clean / clean / exit 0 |

## Not proven

**Nobody has scrolled it.** No renderer component test harness exists here, so
the table, keyboard model, sorting and selection are verified by typecheck and
reading only.

**Row height is duplicated** — `ROW_HEIGHT = 32` in the component, `height:
32px` in the CSS, each with a comment pointing at the other. Nothing enforces
the pair. If they diverge the list drifts as it scrolls, and no test would
catch it because the maths is correct on both sides of the disagreement.

**Dropping the column is the irreversible half.** The list is now the only route
to a backlogged ticket. Open, move, archive and grouping all exist there, and
the editor's stage select can still send one back — but a route I have not
thought of is now a dead end, and that is a claim about my own imagination
rather than a verified fact.

**Shift-click plumbing is untested.** `rangeBetween` has tests; reading
`nativeEvent.shiftKey` off a change event does not, and it is the kind of thing
a React upgrade breaks quietly.
