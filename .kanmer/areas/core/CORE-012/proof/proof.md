# Proof

Ticket commit `dd90c85`, merged `--no-ff` into `v3-phase-minus-1-prework`.

## The bug was proven present before it was fixed

The new test was written first and run against unfixed code:

```
FAIL  migration: v2 → v3 > migrateBoard on an already-migrated board changes nothing
AssertionError: expected false to be true
  411|     expect(again.v2.alreadyV2).toBe(true);
```

So the test genuinely catches this, rather than passing for unrelated reasons.

## Fixed, on the original repro

The reproduction from the ticket body — migrate `sandbox-harness/.kanmer`, then
run `migrateBoard` a second time — re-run on the merged base after rebuilding
`packages/core/dist`:

```
before: second run alreadyV3: false
after:  second run alreadyV3: true
```

Everything else about the migration is unchanged: `dry-run == applied: true`,
6 items in and 6 out, stages `backlog, done, implementing, preparing, review,
verifying`.

## The assertion that does the work

`expect(await fs.readFile(versionFile, "utf8")).toBe(stamped)` — the version
file byte-for-byte, not just the two booleans. A re-stamp writes a fresh
`migratedAt`, so a flags-only check would pass while the file still churned on
every run.

## Rail

- `npm run test -w @kanmer/core` — **117** (was 116; +1 new)
- `npm run test -w @kanmer/gui` — 136, 17 files
- `smoke.mjs` 117/117 · `smoke-protocol.mjs` 26/26
- `npm run typecheck -w @kanmer/gui` — clean
- `npm run plugin:build` + `plugin:check` — 29 tools match, bundle bytes match

The plugin rebuild is required even though this is a core-only fix: core
compiles into `plugins/kanmer/mcp/kanmer-mcp.cjs` (AGENTS.md §8 gotcha 8), and
`migrate_board` is the one caller that could actually hit this bug.

## Scope held

Only `migrate.ts:84` changed. `migrate.ts`'s `=== 3` and `store.ts`'s `=== 1`
were checked and deliberately left: 3 is the maximum format so equality and
`>=` coincide there, and the `=== 1` branch is legacy handling that must stay
exact.
