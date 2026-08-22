# Files — CORE-085

## Modify

| Path | Responsibility |
|---|---|
| `packages/mcp-server/src/sources.ts` | Scope conditional validators to the final cached redirect target and preserve explicit `force` semantics when joining active refreshes. |
| `packages/mcp-server/src/sources.test.mjs` | Add deterministic regressions for intermediate redirect 304 and concurrent forced refresh behavior. |

## Verify / reuse

- CORE-081 source/cache helpers and fixtures.
- CORE-026/CORE-081 cumulative review packets and FRD-027/ADR-0020.

## Do not modify

GUI sync, GitHub protection/variables, board files, unrelated MCP tools, or prior CORE-081 evidence.
