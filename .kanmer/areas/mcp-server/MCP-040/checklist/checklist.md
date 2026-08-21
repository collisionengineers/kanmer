# Checklist — MCP-040

- [ ] Create the ticket branch/worktree and run the canonical plugin build.
- [ ] Confirm the diff contains only `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- [ ] Run `npm run plugin:check` — PASS.
- [ ] Run `npm run verify` — PASS end-to-end.
- [ ] Record artifact hash and command exits in the post-implementation report.
- [ ] Stop at Review for independent review; do not merge or write proof in the implementation pass.
