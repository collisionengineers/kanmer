# Research — MCP-033

## Finding

The source merged by [[MCP-022]] is functionally correct. The failure is only the committed generated plugin artifact.

A fresh normal-main `npm run build && npm run plugin:check` exits 1 because the tracked bundle was produced in `.worktrees/mcp-022`. Esbuild preserves source-module paths in generated comments/CommonJS wrapper labels. The linked build names resolved dependencies as `../../../../node_modules/…`; the normal root build names them `../../node_modules/…`. The normal rebuild changes exactly 514 added and 514 removed generated lines in `plugins/kanmer/mcp/kanmer-mcp.cjs`.

[[MCP-030]] established the governing decision: the main checkout’s dependency tree is canonical; retain strict byte comparison and regenerate the artifact from normal main. Do not weaken the checker or try to make linked worktrees canonical.

## Implication

This fix is a canonical generated-artifact refresh only. Build it from normal main, place that byte-identical output onto an isolated ticket branch, review it, then prove `plugin:check` on merged main. No source/runtime/dependency/checker change is required.

## Questions

None; the existing canonical-main decision resolves scope.
