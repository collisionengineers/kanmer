# Proof

Branch `v3-phase-minus-1-prework` at `cb39080`.

- A freshly created ticket's file contains no `priority:` line.
- A hand-added `priority: high` survives an unrelated `updateItem` untouched —
  the passthrough guarantee, asserted the same way the `due` test asserts it.
- A written board contains no `priorities:` block.
- **Live:** 40 tickets on this repo's own board had `priority` stripped during
  migration, reported as a count.
