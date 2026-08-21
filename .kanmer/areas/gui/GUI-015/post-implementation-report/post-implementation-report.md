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

## Reconciliation addendum — 2026-08-21

This ticket was taken in fresh branch/worktree gui-015-backlog-list-audit/.worktrees/gui-015 from origin/main cfd2e35a to audit its stale Implementing state. No implementation is appropriate on current main: GUI-015 historical PR #23 (commit 841c5bc0) shipped the separate Backlog view, then GUI-070 deliberately removed it in commit 2f06713. Both commits are reachable from origin/main; the current tree has no BacklogTable.tsx, windowedRows.ts, Backlog view branch, or related exports. FRD-011 is status: withdrawn, and its amendment says the table is not to be reinstated; PRD-001 records the same accepted tradeoff. Reintroducing the feature would contradict the governing documents and GUI-070.

### Scope disposition

- No source files changed; branch remains clean.
- GUI-016 and GUI-017 were not touched.
- Existing commit/PR traceability remains 841c5bc / PR #23; no duplicate PR was created.
- The original 15 checklist boxes remain unchecked because they describe withdrawn functionality, not current deliverables. This is not presented as an implementation PASS.
- Independent root review should decide the board disposition of this stale active ticket (for example, reconcile it as superseded by GUI-070 or archive it through the board workflow). No governing-doc rewrite or reintroduction was authorized in this lane.

### Verification

- git merge-base --is-ancestor 841c5bc origin/main: exit 0.
- git merge-base --is-ancestor 2f06713 origin/main: exit 0.
- Current BacklogTable source: absent.
- git diff --check: exit 0; no source diff.
- npm run typecheck -w @kanmer/gui: exit 0.
- npm run build -w @kanmer/gui: exit 0; existing gray-matter eval warning only.
- npm test -w @kanmer/gui: printed the GUI test files as passing but the Vitest process did not terminate; after preserving the hang, it was interrupted with Ctrl+C and exit 1. Result is INCONCLUSIVE, not PASS.
- Manual GUI scrolling/keyboard/selection evidence: unavailable and not claimed.

Author stops at Review for independent root review. No self-review, merge, cleanup, or feature resurrection was performed.
