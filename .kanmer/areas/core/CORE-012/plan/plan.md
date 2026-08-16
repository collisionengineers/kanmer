# Plan

Change the guard to `>= 2` and return `emptyReport(dryRun, true)` unchanged.
`alreadyV2: true` is the honest answer for a format-3 board: the v1→v2 step has
nothing to do, which is exactly what the flag means.

Rejected alternatives:

- **Guard inside `migrateBoard` instead.** It would fix the umbrella and leave
  `migrateToV2` still willing to downgrade a v3 board when called directly. The
  MCP `migrate_board` tool and the GUI both reach the same function; the guard
  belongs where the assumption is.
- **Make `detectFormat` return 2 for v3 boards.** Obviously wrong, but worth
  naming — the temptation is to make the existing comparison true rather than to
  fix the comparison.

The test is the part that matters, because the bug is invisible in a single run:
`migrateBoard` restamps to 3 immediately after the downgrade, so only a
**second** run exposes it. The existing suite migrates once. Add a re-run
assertion:

1. migrate a format-2 fixture, capture `version.json`
2. run `migrateBoard` again
3. assert `v2.alreadyV2` **and** `v3.alreadyV3` are both true
4. assert `version.json` is byte-identical — this is what catches a re-stamp
   with a fresh `migratedAt`, which the boolean flags alone would not

Step 4 is the real assertion. Flags can be right while the file churns.
