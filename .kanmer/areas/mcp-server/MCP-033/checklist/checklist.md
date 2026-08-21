# Checklist — MCP-033

- [x] Capture normal-main failed artifact SHA/diff and root cause.
- [x] Rebuild canonical plugin artifact from normal main only.
- [x] Confirm the generated diff touches only `plugins/kanmer/mcp/kanmer-mcp.cjs` and only path comments/wrapper labels.
- [x] Create isolated `.worktrees/mcp-033` / `mcp-033-canonical-plugin-bundle`.
- [x] Apply only the canonical generated artifact to that branch.
- [x] Run normal-main `npm run build`, `npm run plugin:check`, MCP smoke (184/184), and `git diff --check`.
- [x] Write implementation report with checksum/evidence and open PR #104.
- [ ] Independently review and merge only the artifact-only PR.
- [ ] Verify on merged main that `plugin:check` passes with clean status.
- [ ] Write proof, move Done, close out the ticket, and release worktree/branch.
