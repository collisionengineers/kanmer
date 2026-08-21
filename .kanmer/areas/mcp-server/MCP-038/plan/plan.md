# MCP-038 plan

1. Recreate the artifact in a ticket worktree from current main using npm run plugin:build.
2. Confirm git diff contains only plugins/kanmer/mcp/kanmer-mcp.cjs.
3. Run npm run plugin:check twice, including after a fresh build, and run git diff --check.
4. Record post-implementation evidence, open a PR, obtain independent review, merge, then verify the artifact on merged main.
