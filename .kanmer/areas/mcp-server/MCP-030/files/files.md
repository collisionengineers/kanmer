# Files — MCP-030

| Path | Role |
|---|---|
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated committed standalone artifact. Expected change is only esbuild module-path comments/wrapper labels caused by the canonical main-checkout dependency topology. |
| `scripts/check-plugin-sync.mjs` | Read-only context: its byte comparison is intentionally kept, and its linked-worktree refusal is the controlling constraint. |
| `packages/mcp-server/tsup.standalone.config.ts` | Read-only context: it defines the standalone bundle bytes. |
| `scripts/build-plugin.mjs` | Read-only context: copies canonical standalone output into the tracked plugin artifact. |

## Scope

No runtime source, test, lockfile, or checker logic should change. Rebuild the artifact from the canonical main checkout, validate byte equality there, and record why the worktree-generated bundle was invalid.

## Risk

Do not run `plugin:build` in a linked ticket worktree. Its result can pass an invalid local comparison yet differ from the main checkout.
