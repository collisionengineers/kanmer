# Backfilling pre-board history — research

## What exists to mine

`docs/plans/` holds the record of everything built before this board: nine v2
phase plans, the updater plan, an upgrades roadmap, two PR reviews, an
implementation audit and a to-do document.

**No open GitHub issues** (`gh issue list` returns empty), so 5a of the ingest
order does not apply and the confirm-then-close flow is not exercised. Stated
because the ticket asks for it and its absence is a real gap in what this run
proves.

## The item marker, and a near-miss

The v2 phase plans collect work under `## Items` as `### <n>.<m> <title> — <size>`.
My first miner matched that literally and reported three sources as having
nothing to mine.

Two of them genuinely have nothing — `phase-9` and `kanmer-upgrades` are context
and sequencing documents. But **`updater/plan.md` has 24 real items**, in the
same `### N.M` shape, nested under `## Phase N` headings instead of one `## Items`.

Matching the item marker itself rather than its container finds all three
structures, and finds nothing in documents that are pure prose. The first
version would have silently dropped 24 tickets while reporting success — the
same failure mode as a too-narrow exit grep.

## Per item, not per document

ADR-0010 is explicit, and the reason is that the items are what reveal the
board's areas. Nine documents would produce nine tickets and no structure; 60
items produce a distribution across core/mcp-server/gui/skills that mirrors how
the work actually fell.

## Why `custom` with an empty requires map

These tickets have no research, no checklist, no report, and never will. Under
any shipped profile they are permanent gate debt — `kanmer-groom` would surface
60 tickets owing documents nobody will write.

`custom` with `requires: {}` asks for nothing, which is the honest description
of work finished before the board existed.

## Creation into Done is what makes this possible

`create_item` is ungated by design (FRD-002 G3). CORE-011's one-gated-boundary
rule constrains `move_item`, not creation, so 60 tickets can be born in Done
without crossing a single gate. Checked rather than assumed — it is the
load-bearing assumption of the whole ticket.

## Idempotency

Dedup on title. The `Source:` line goes in each body per ADR-0010, but titles
are what a re-run compares, because a mined item has no id of its own until it
becomes a ticket.
