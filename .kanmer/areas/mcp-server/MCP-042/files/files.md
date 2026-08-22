# Files — MCP-042

- `plugins/kanmer/mcp/kanmer-mcp.cjs`: replace the committed standalone MCP artifact with the canonical `npm run plugin:build` output.
- `scripts/check-mcpb-sync.mjs`: read-only validation only; modify only if the failure proves a defect in the checker itself.
- No GUI files, source MCP behavior, board data, or generated release metadata beyond the committed plugin artifact.

The artifact must remain byte-identical to a fresh build and must not embed timestamps or machine-specific paths.
