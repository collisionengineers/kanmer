# The format-3 migration — research

Fixed stages, folder documents and priority removal all rewrite the same ticket
files. Three migrations would mean three prompts and three chances to
half-migrate — and a board caught between two of them is in a state no code
path expects. ADR-0008 makes it one.

Kanmer already has a proven migration vehicle: the v1→v2 run. Everything worth
keeping is already in it, and each behaviour is there because something went
wrong once — dry-run parity, blockers surfaced before any write, per-file
check-before-act (born from Windows EPERM/EBUSY leaving half-renamed folders),
and idempotence.

The one genuinely new decision is what to do with a stage no alias covers. The
options are guess, refuse, or park. Guessing puts work in the wrong column
silently; refusing blocks a whole board on one odd ticket. Parking in Backlog
with a `needs-restage` label and listing each id by name is the only one that is
both safe and visible.

## Shared context

Phase 2 was implemented as one coherent change — the six items touch the same
three files (`types.ts`, `store.ts`, `board.ts`) and their schemas depend on
each other, so splitting the *code* would have meant six broken intermediate
states. They are separate tickets because they are separate decisions, each with
its own ADR and its own way of being wrong. The commit is `cb39080`.
