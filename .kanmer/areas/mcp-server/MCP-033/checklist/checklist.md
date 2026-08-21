# Checklist — MCP-033

- [ ] Capture normal-main failed artifact SHA/diff and root cause.
- [ ] Rebuild canonical plugin artifact from normal main only.
- [ ] Confirm the generated diff touches only `plugins/kanmer/mcp/kanmer-mcp.cjs` and only path comments/wrapper labels.
- [ ] Create an isolated `.worktrees/mcp-033` / `mcp-033-…` branch.
- [ ] Apply only the canonical generated artifact to that branch.
- [ ] Run `npm run build`, `npm run plugin:check`, MCP smoke, and `git diff --check`.
- [ ] Write implementation report with checksums/evidence and open PR.
- [ ] Independently review and merge only an artifact-only PR.
- [ ] Verify on merged main that `plugin:check` passes with clean status.
- [ ] Write proof, move Done, close out the ticket, and release the worktree/branch.
