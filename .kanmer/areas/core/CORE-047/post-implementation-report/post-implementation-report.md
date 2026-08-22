# Post-implementation report — CORE-047

## Outcome

Implemented `47169144` on `core-047-replacement-lock-race`, stacked on CORE-046 `54651a3c77b8ca8d02d9d309e36baf9b62ebca3c`. Stale-lock quarantine now inspects the quarantined inode before deletion; if a replacement lock was moved, it restores it with an exclusive hard link without overwriting a newer lock. A deterministic reversed-order concurrent regression proves the replacement owner remains intact and the losing reclaimer surfaces `EEXIST`. All inherited IO assertions and the existing forward-order race test remain present.

## Verification

- `npm run test -w @kanmer/core -- src/io.test.ts` — PASS, 17/17.
- `npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts` — PASS, 108/108.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- First direct source-test attempt before server build — FAIL/INCONCLUSIVE because the fresh worktree had no MCP server dist; preserved as a setup precondition.
- After building the server with the worktree core junction corrected — `node --test packages/mcp-server/src/sources.test.mjs` PASS, 14/14.

## Boundaries

No hosted workflow, genuine multi-process Windows stress, PID reuse, process termination between inspection and reclaim, or crash-timing evidence is claimed. No unrelated MCP source-policy, GUI, editor, provider, release, or board-store changes were made.
