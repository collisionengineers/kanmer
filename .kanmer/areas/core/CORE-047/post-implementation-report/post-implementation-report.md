# Post-implementation report — CORE-047

## Outcome

Implemented `47169144c0bd13bd205e42922c0282bfd56c466a` and `67e2be792e8480d29df7ff13128fb8c7886056a9` on `core-047-replacement-lock-race`, stacked on CORE-046 `54651a3c77b8ca8d02d9d309e36baf9b62ebca3c`. Stale-lock claims now carry unique owner tokens/leases, release only a matching token, coordinate quarantine cleanup with owner release, and retain an active replacement when a third claimant owns the original path. Deterministic release-order and third-claimant regressions cover the two adversarial cases; the forward/reversed-order coverage and inherited IO assertions remain intact. The standalone plugin artifact was regenerated.

## Verification

- `npm run test -w @kanmer/core -- src/io.test.ts` — PASS, 18/18.
- `npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts` — PASS, 109/109.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `npm run plugin:build` — PASS; regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 14/14.
- Initial direct source-test attempt before server build — FAIL/INCONCLUSIVE because the fresh worktree had no MCP server dist; preserved as a setup precondition.

## Boundaries

No hosted workflow, genuine multi-process Windows stress, PID reuse, process termination between inspection/reclaim, or crash-timing evidence is claimed. No unrelated MCP source-policy, GUI, editor, provider, release, or board-store changes were made.
