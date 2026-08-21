# Files — MCP-033

| Path | Change | Risk |
|---|---|---|
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Replace the linked-worktree-generated artifact with normal-main canonical output. | Generated diff is large; must remain path-comment/wrapper-label-only. |

## Context

| Path | Why read it |
|---|---|
| `scripts/check-plugin-sync.mjs` | Defines strict byte comparison and normal-checkout authority. |
| `scripts/build-plugin.mjs` | Copies standalone output into the tracked plugin path. |
| `packages/mcp-server/tsup.standalone.config.ts` | Confirms standalone bundle source and determinism contract. |
| [[MCP-030]] research/plan/proof | Prior identical class: canonical main artifact refresh, not checker weakening. |
| [[MCP-022]] proof | Exact current failure and blocker relationship. |

## Out of scope

No MCP source changes, lockfile/dependency changes, checker changes, or changes to MCP-022 behavior.
