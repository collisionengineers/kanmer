# Checklist — MCP-039

- [ ] Confirm merged MCP-027 source is the build input.
- [ ] Regenerate the committed standalone plugin bundle.
- [ ] Verify the diff contains only the generated artifact.
- [ ] Run `npm run plugin:check`.
- [ ] Run targeted build/typecheck checks.
- [ ] Record commit/PR and independent review.
- [ ] Write merged-main proof before Done.

- [x] Confirmed merged MCP-027 source is the build input.
- [x] Regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` with `npm run plugin:build`.
- [x] Artifact-only diff confirmed; `git diff --check` passes.
- [x] Committed as `01d64ba0` and opened PR #115.
- [ ] Run plugin:check on merged main after PR #115 merges.
