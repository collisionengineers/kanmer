# CORE-091 files

## In scope

- `plugins/kanmer/mcp/kanmer-mcp.cjs` — refresh from the fresh standalone build.

## Read-only evidence / commands

- `scripts/build-plugin.mjs`
- `scripts/check-plugin-sync.mjs`
- `scripts/build-mcpb.mjs`
- `scripts/check-mcpb-sync.mjs`
- `packages/mcp-server/tsup.standalone.config.ts`
- `package.json` scripts `plugin:build`, `plugin:check`, `mcpb:build`, `mcpb:check`

## Explicitly out of scope

- `packages/mcp-server/src/**`, `packages/core/src/**`, GUI/provider code, manifests, skills, tests, dependencies, and workflow policy.
- Any weakening, deletion, or bypass of byte-parity assertions.
- `dist/**` and `dist/mcpb/**`, which are disposable build outputs and must not be committed.
