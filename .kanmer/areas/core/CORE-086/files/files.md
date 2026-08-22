# Files

## In scope

- plugins/kanmer/mcp/kanmer-mcp.cjs — regenerated committed standalone MCP plugin artifact from exact cumulative base fcd998550714811edac99032ea7118f9b2084d38.
- scripts/build-plugin.mjs and scripts/check-plugin-sync.mjs — inspected build/parity rails; no source edits expected.
- scripts/build-mcpb.mjs and scripts/check-mcpb-sync.mjs — inspected MCPB parity rails; no source edits expected.
- package.json — inspected npm commands; no source edit expected.

## Explicitly out of scope

No changes to packages/mcp-server/src, packages/core, GUI code, docs/functional, docs/architecture, board files, or parity assertions. CORE-086 records the artifact required by CORE-081 and does not absorb CORE-081 behavior changes.
