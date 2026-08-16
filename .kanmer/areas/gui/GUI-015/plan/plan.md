# Plan

## Windowing without a dependency

`lib/windowedRows.ts`: given scroll offset, viewport height, row height and
count, return `{ start, end, padTop, padBottom }`. Pure, ~20 lines, unit
tested. The table renders `rows.slice(start, end)` between two spacer divs.

No library. AGENTS.md §8 gotcha 5 makes a runtime dependency a packaging
question, and a fixed-height table row makes the maths trivial. An
**overscan** of a few rows above and below stops blank flashes during fast
scrolling.

## Sort is list-only

Sort state lives in `BacklogTable`, never in App and never written to `order`.
The board's order is manual and human-meaningful; a list sort that persisted it
would silently rewrite the human's arrangement. Sorting by id, title, area,
profile, updated — display only.

## Selection and bulk actions

Checkbox per row, shift-click for a range, a header checkbox for all-visible.

Three bulk actions:

- **Move to Preparing** — per ticket, so a mixed selection partly succeeds.
  Report the failures with the reason `get_doc_gates` gives. Silently moving
  7 of 10 is the worst outcome; refusing all 10 because one lacks a governing
  doc is the second worst.
- **Add to group** — one group, applied to all.
- **Archive** — confirmed, count named.

## Dropping the Backlog column

`Board` filters `backlog` out of its stages. The list becomes the only route to
a backlogged ticket, so it must first support open, move, archive — which is why
that line lands last, after the actions work.

Drag-to-Backlog also disappears with the column. Moving a ticket *back* to
Backlog stays possible from the editor's stage select and the card menu; worth
checking rather than assuming.

## Keyboard and a11y

`<table>` with `role="row"`, `aria-selected`, `aria-sort` on the sorted header.
Up/Down move the focused row, Space selects, Enter opens. A real table gives the
row semantics the ticket asks for without ARIA scaffolding.

## Verification

Unit tests on the windowing maths, including the boundary cases that make
virtualization wrong when they are wrong: zero rows, fewer rows than the
viewport, scrolled past the end. Then a 200-row fixture rendered in the app for
the jank check, which is the one thing tests cannot answer.
