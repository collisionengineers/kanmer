# Plan

Chips render from `item.groups` directly - no lookup, no fetch. A group id is
already meaningful on its own (`EPIC-001`), and requiring a title lookup to draw
a chip would make the board wait on a second read.

The chip's click **stops propagation**. Without it the card's own `onClick`
fires too and the card is selected as a side effect of filtering, which reads as
a bug.

`onFilterGroup` is a stable `useCallback`, threaded down as a function rather
than passing the whole filter object - `Card` is memoized, and the board's
existing performance work depends on its props staying primitive or stable.

The filter goes in App's single item predicate, so the group lens narrows every
view at once rather than being a board-only feature. That is what FRD-001 G8
means by a horizon filter narrowing "every view".

Dropdown options come from the tickets, not from `list_groups`: a group nothing
is in is not a useful lens, and deriving them means the list cannot go stale.
