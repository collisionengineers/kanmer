# Post-implementation report

PR [#23](https://github.com/collisionengineers/kanmer/pull/23).

## File changes

| Path | Change |
|---|---|
| `renderer/src/lib/windowedRows.ts` | **New** — windowing maths + `rangeBetween`. |
| `renderer/src/lib/windowedRows.test.ts` | **New** — 13 tests. |
| `renderer/src/components/BacklogTable.tsx` | **New** — the view. |
| `renderer/src/App.tsx` | `backlog` view, bulk handlers. |
| `renderer/src/components/Board.tsx` | Filters `backlog` out of its columns. |
| `renderer/src/styles.css` | Table, sticky header, selection. |
| `packages/ui/src/index.ts` | Barrel export. |

## Against the governing docs

**FRD-011** — windowed table, shared filters, list-only sort, row and bulk
actions, keyboard navigation, row semantics (`role="row"`, `aria-selected`,
`aria-sort`). **PRD-001 problem 6** is the thing being fixed.

Filters needed no work: App's predicate already narrows every view, so "shared
filters" is satisfied by rendering the same filtered array.

## The 200-row criterion, and what I could actually prove

The ticket says "a 200-row fixture scrolls without jank". Jank is a rendering
property and this repo cannot test rendering. What *is* provable is the property
jank would violate: the rendered row count stays constant as the list grows, and
the scroll height stays exact. Both are asserted to 10,000 rows.

That is a weaker claim than the ticket asks for, honestly labelled rather than
declared equivalent.

## For review

**Nobody has scrolled it.** No renderer component test harness exists here, so
the table, keyboard model and selection are verified by typecheck and reading.

**Shift-click reads `nativeEvent.shiftKey` off a change event.** It works today
and could break silently under a React upgrade. `rangeBetween` is tested; the
plumbing into it is not.

**Dropping the Backlog column is the risky half.** Once merged, the list is the
only route to a backlogged ticket. I checked that open, move, archive and
grouping all exist there first, and that the editor's stage select can still
send a ticket back — but a route I have not thought of would now be a dead end.

**Row height is duplicated** — `ROW_HEIGHT = 32` in the component and `height:
32px` in the CSS, with a comment in each pointing at the other. Nothing enforces
it; if they diverge the list drifts as you scroll. A CSS variable read at runtime
would fix it and would cost a layout read per render.

## What kanmer-verify should run

The 13 unit tests; typecheck, build, boot; and with a running app: open Backlog
on this 102-ticket board, scroll it, sort a column, select a range with
shift-click, and bulk-move a mixed selection to confirm the partial-failure
report names the ungated tickets.
