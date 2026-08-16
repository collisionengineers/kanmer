# Plan

The requirement wire form is a **string** (`plan`, `proof:visual@staging`,
`research/auth`) so `board.yml` stays readable by a human. `parseRequirement`
splits `@` first, then `:`, then `/` — that order matters, or a path containing
`@` would be read as an environment.

Resolution is FRD-002 P6: ticket → area → board. The ticket is checked first,
which is what makes "changing area does not override an explicit profile" true.

`evaluateGateReport` returns the whole picture — every boundary, what is
satisfied, warnings, and per-stage reachability — rather than a yes/no. One call
answers both "can I move" and "why not", so the GUI's lock-tint and an agent's
self-check read the same data.

`move_item` rejects on the **first** unmet boundary, so the error names one
concrete next action instead of a wall of everything missing.

An unknown profile id resolves to *no requirements* at read time rather than
throwing: validation rejects it on write, and a gate check is the wrong place to
fail a read.
