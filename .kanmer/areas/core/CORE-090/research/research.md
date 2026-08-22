# Research

The CORE-026 cumulative branch at `973bcf93` fails the hosted `verify` job in
`scripts/check-mcpb-sync.mjs`: the MCPB server produced from current sources
differs from `plugins/kanmer/mcp/kanmer-mcp.cjs`. Running `npm run plugin:build`
in the cumulative worktree reproduces the mismatch and refreshes only that
tracked artifact; `npm run mcpb:check` then passes. This is an artifact
provenance defect, not new product behaviour.
