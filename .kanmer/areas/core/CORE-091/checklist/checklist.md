# CORE-091 checklist

- [x] Confirm the pre-fix hash mismatch and inspect the source/artifact build contract.
- [x] Refresh `plugins/kanmer/mcp/kanmer-mcp.cjs` with `npm run plugin:build` from the ticket checkout.
- [x] Confirm the tracked diff is artifact-only and passes `git diff --check`.
- [x] Run `npm run plugin:check`, `npm run mcpb:check`, and `npm run test:scripts`; record exit codes and hashes.
- [x] Write the post-implementation report with exact commit, PR, and command evidence.
- [ ] Obtain independent review and disposition every finding before merge.
- [ ] Verify the exact merged artifact on `main`, write proof, release the ticket, and clean up the exact worktree/branch.
