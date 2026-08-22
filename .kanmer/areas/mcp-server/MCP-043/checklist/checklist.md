# Checklist — MCP-043

- [x] Take MCP-043 in .worktrees/mcp-043 on branch mcp-043-plugin-artifact.
- [ ] Run the canonical npm run plugin:build and refresh only plugins/kanmer/mcp/kanmer-mcp.cjs.
- [ ] Confirm artifact-only diff, fresh/committed SHA-256 parity, and git diff --check.
- [ ] Run npm run plugin:check and npm run mcpb:check.
- [ ] Run MCP smoke/protocol, MCP-server typecheck/build, and scripts rails; preserve exact failures.
- [ ] Write the post-implementation report and record commit/PR traceability.
- [ ] Push, open the MCP-043 PR, and move the ticket to Review for independent review.

## Progress notes
