# The Backlog list view — research

## The problem, restated from PRD-001

Problem 6: a 194-card Backlog column is a list problem wearing a kanban costume.
Kanban columns are for work in flight, where seeing every card at once is the
point. A backlog is a queue you scan, sort and triage — operations a column
cannot do.

This board is now the case in point. After SKILL-006 it holds **102 tickets**,
and though the backfill went straight to Done, the shape of the problem is real.

## Two things the ticket asks for, and they are separable

1. A **virtualized table** with shared filters, list-only sort, row and bulk
   actions, keyboard navigation.
2. **The board drops its Backlog column**, "completing 4.2".

The second is a one-line change with a large consequence: after it, the *only*
way to see or work a backlogged ticket is the new view. So the list has to carry
everything the column could do — select, open, move, archive — before the column
goes, or the change strands tickets.

## Virtualization

The ticket says virtualized and names a 200-row fixture. No virtualization
library is in `apps/gui`, and adding a runtime dependency runs into AGENTS.md §8
gotcha 5: electron-builder packs only `electron-updater` from `node_modules`, so
a new runtime dep must be a devDependency bundled by electron-vite.

A windowed list is ~40 lines against a fixed row height, and avoids the
dependency question entirely. Fixed row height is the constraint that makes it
trivial, and a table row is naturally fixed-height.

## Filters are already shared

`Filters` and the App predicate already narrow every view — that came with
GUI-013's group filter. So "shared filters" needs no work: rendering the same
filtered array is the whole of it. **Sort is list-only** (D27), which means sort
state lives in the table, not in App, or it would leak into the board's manual
ordering.

That distinction matters: the board's order is *manual* and human-meaningful
(`order` on the item). A sort in the list must never write it.

## Bulk actions and gates

"Gate-checked Move to Preparing" — with CORE-011, a move crosses at most one
gated boundary, and Backlog → Preparing is exactly one. But a `feature` needs a
governing doc to leave Backlog, so a bulk move over a mixed selection will
partly fail.

Partial failure is the interesting case. Silently moving 7 of 10 and saying
nothing is the worst option; refusing all 10 because one is ungated is the
second worst. Move what can move, and report what could not and why — the
reasons are already computed by `get_doc_gates`.

## Row semantics

The ticket asks for a11y row semantics. A `<table>` with `role="row"` and
`aria-selected` gives that for free, which is the argument for a table over a
list of divs.
