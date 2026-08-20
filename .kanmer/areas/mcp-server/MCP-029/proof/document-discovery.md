# Proof — MCP-029

Merged via PR #65 at commit `1febc858ed8a06782a18699750a62c6e6b903e29`.

Merged-main verification passed:

- `npm test -w @kanmer/core`: 249 tests.
- `npm run typecheck -w @kanmer/core` and `npm run typecheck -w @kanmer/mcp-server`: passed.
- `node packages/mcp-server/src/smoke.mjs`: 159/159 passed, including exact nested `documentPaths` exposure and bare-index absence when only a named document exists.
- `npm run smoke:protocol`: 26/26 passed.
- `git diff --check`: passed.

The initial main-checkout plugin-byte mismatch was caused by the committed artifact having been generated from a linked worktree. Follow-up [[MCP-030]] regenerated the canonical artifact; on its merged main, `npm run build && npm run plugin:check` now passes (30 tools, byte equality, 12 strict skill frontmatters, manifests).
