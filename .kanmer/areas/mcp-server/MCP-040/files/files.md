# Files — MCP-040

- Modify: `plugins/kanmer/mcp/kanmer-mcp.cjs` only.
- Generate it with the canonical `npm run plugin:build` flow on the ticket branch after source and dependency state are fixed.
- Do not modify MCP source, tool schemas, package manifests, release scripts, or unrelated generated outputs.
- Verification uses canonical `npm run plugin:check`, `npm run verify`, and `git diff --check` from a normal checkout.
