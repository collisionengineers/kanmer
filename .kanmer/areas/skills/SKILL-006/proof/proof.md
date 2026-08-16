# Proof

No commit — this ticket's artifact is board data, not code. Verified against the
live board.

## The audit the ticket asked for: N docs → M items → K tickets

```
11 documents → 60 items → 60 tickets
by area: core 8, mcp-server 3, gui 46, skills 3
```

Two sources named as yielding nothing, with the reason:
`phase-9-dedicated-board-worktree` and `kanmer-upgrades` — context and
sequencing documents with no numbered work items.

## Ten spot-checked file-for-file

Spread across every source, not the first ten. Each asserts **both** that the
ticket's title appears in its source plan **and** that a distinctive line
(>50 chars) of the written `plan/` document appears there too — title-only
matching would pass against an empty document.

```
title-ok  body-ok  3064ch  CORE-013  1.1 The `docs:` block + `docs.ts` module
title-ok  body-ok   547ch  CORE-019  1.7 Remove `due`
title-ok  body-ok   413ch  GUI-022   3.5 New IPC
title-ok  body-ok   264ch  GUI-028   4.4 More settings
title-ok  body-ok   998ch  GUI-034   6.1 Provider registry
title-ok  body-ok   579ch  GUI-040   1.1 The dependency
title-ok  body-ok   750ch  GUI-046   1.7 npm scripts
title-ok  body-ok  2673ch  GUI-052   2.6 `main/index.ts` integration
title-ok  body-ok  3486ch  GUI-058   6.1 `scripts/release.mjs`
title-ok  body-ok  1223ch  MCP-002   2.1 New tools (+4)

10/10 verified file-for-file against source
```

The first run of this check reported **0/10** — it read `doc.content`, which is
the GUI's IPC wrapper shape, where core's `getDoc` returns the string directly.
The data was correct and the check was wrong. Recording it because a broken
verification that reports failure is lucky; one that reports success is not.

## Second run is a no-op

```
11 documents → 60 items → 0 tickets (60 already on the board)
created 0 done tickets
```

## Board invariants

- total 42 → **102**
- **open unchanged at 7** — every ticket was born in Done
- all 60 are `status: done` — checked, not assumed
- all 60 are `profile: custom` with an empty requires map, so none carries gate
  debt

## Not proven

**GitHub issue ingestion never ran.** No open issues exist. The
confirm-then-close flow is the most dangerous path in `kanmer-setup` and remains
verified only by reading.

**`phase-9`'s work is unrepresented.** The board worktree shipped and is in
daily use here, but its plan has no numbered items — only design-area headings.
Mining those would have invented work items. Left out and flagged.

**Nobody has read the 60 mined plans for quality.** Ten were checked for
fidelity to source. Whether the mined text is *useful* as a plan document, as
opposed to faithfully copied, is unexamined.
