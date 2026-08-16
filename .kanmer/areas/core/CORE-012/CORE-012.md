---
id: CORE-012
type: ticket
title: migrateToV2 downgrades a format-3 board to format 2
status: preparing
area: core
assignee: ''
profile: fix
labels:
  - bug
  - v3-phase-2
links: []
refs:
  - docs/functional/frd/FRD-007-fixed-six-stage-board.md
archived: false
created: '2026-08-16T04:41:03.043Z'
updated: '2026-08-16T04:42:10.403Z'
---

`packages/core/src/migrate.ts:84`:

```ts
if ((await store.detectFormat()) === 2) return emptyReport(dryRun, true);
```

On a **format-3** board `detectFormat()` returns 3, so the guard misses and the
v1→v2 migration runs anyway. It rewrites `version.json` to
`{"format": 2, "migratedFrom": 1}`, and `migrateBoard` then re-runs the v3 step
to stamp it back to 3.

Consequences:

- `migrateBoard` is **not idempotent**. A second run reports `alreadyV2: false`
  and `alreadyV3: false` on a board that is fully migrated. Phase 2's stated
  acceptance is "re-run byte-identical".
- There is a window where a **format-3 board is stamped format 2** on disk. Any
  reader that starts during it — a GUI in another window, an MCP server, a
  crash midway — sees a v2 board with v3 content.
- The report lies: it claims v1→v2 work was done on a board that has been v3
  for some time.

Same class as the `format === 2` → `format >= 2` sweep done in `store.ts`
during 2.1; `migrate.ts` was missed. Fix is `>= 2` — `alreadyV2: true` is the
right answer for a format-3 board, because there is nothing for the v1→v2 step
to do.

Swept the rest of core: `migrate.ts:558` (`=== 3`) is correct (3 is the maximum)
and `store.ts:200` (`=== 1`) is deliberate legacy handling. This is the only
occurrence.

**Not reachable from the GUI** — the Migrate banner only renders for
`format < 3`, so no user can trigger it from [[GUI-005]]. It is reachable from
the `migrate_board` MCP tool, which has no such guard.

**Reproduction:** migrate `sandbox-harness/.kanmer` (format 2) with
`migrateBoard`, then call `migrateBoard` again — the second run reports
`alreadyV3: false` and re-does the work.

**Test to add:** a third run in the migration suite asserting `alreadyV2` and
`alreadyV3` are both true and `version.json` is byte-identical.
