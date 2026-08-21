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

## Closeout — 2026-08-21

- [x] Confirmed PR #104 merged at `1962f028adae43955693658beff382b3160caa54`.
- [x] Confirmed merged-main proof: canonical bundle SHA `c1fc1143175e08ccdc894ec85e69dde1edecc126`, `plugin:check` and MCP smoke pass.
- [ ] Remove recorded `.worktrees/mcp-033` and delete `mcp-033-canonical-plugin-bundle`.
- [ ] Release ticket after cleanup.

- [x] Removed `.worktrees/mcp-033`, deleted local/remote `mcp-033-canonical-plugin-bundle`, and pruned worktrees.
- [x] Released ticket; [[MCP-022]] may now re-run its final normal-main proof.
