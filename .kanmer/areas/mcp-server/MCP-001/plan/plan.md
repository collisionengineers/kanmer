# Plan

Add the five group tools rather than a generic "entity" surface: explicit tools
are what the annotations and descriptions hang off, and an agent scanning
`tools/list` should see `get_group`, not a verb with a discriminator.

Every group read carries `readOnlyHint`; nothing about groups is destructive
(archive is an update), so no new `destructiveHint`.

Descriptions are written as the contract layer, not as parameter lists. Each one
says what the tool is *for* and what an agent must know before using it —
`get_doc_gates` leads with "call this before any move", `create_group` explains
that membership rides on `update_item`, `get_group` says membership is derived
so it cannot go stale.

Rejected: a dedicated add/remove-member tool. Membership is a ticket field, and
a verb would imply the group owns the list — the exact confusion ADR-0001
avoids.
