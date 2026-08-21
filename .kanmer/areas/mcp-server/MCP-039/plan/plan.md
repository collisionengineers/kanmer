# Plan — MCP-039

## Scope

Regenerate the committed `plugins/kanmer/mcp/kanmer-mcp.cjs` artifact from the merged MCP-027 source and prove `npm run plugin:check` passes on the ticket branch. No source behavior or tool policy changes.

## Steps

1. Run the canonical plugin build from the ticket worktree.
2. Inspect the artifact-only diff and verify no unrelated files changed.
3. Run `npm run plugin:check` and the targeted MCP build/typecheck rail.
4. Commit the generated artifact, push the branch, and open a PR for independent review.

## Out of scope

Doctor behavior, board schema, MCP tools, GUI behavior, and release publishing.
