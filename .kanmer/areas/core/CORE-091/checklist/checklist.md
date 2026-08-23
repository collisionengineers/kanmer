# CORE-091 checklist

- [x] Confirm the pre-fix hash mismatch and inspect the source/artifact build contract.
- [x] Refresh `plugins/kanmer/mcp/kanmer-mcp.cjs` with `npm ci` followed by `npm run plugin:build` from the ticket checkout.
- [x] Confirm the tracked diff is artifact-only and passes `git diff --check`.
- [x] Run `npm run plugin:check`, `npm run mcpb:check`, and `npm run test:scripts`; record exit codes and hashes. Hosted first attempt exposed a plain-install/clean-CI artifact mismatch; the corrected clean-`npm ci` artifact is now recorded.
- [x] Write the post-implementation report with exact commit, PR, and command evidence.
- [x] Obtain independent review and disposition every finding before merge. Review PASS at ddf055699a88be2dd6897e11735e474bd15716d3; initial artifact mismatch fixed in ddf05569; hosted verify/kanmer-gate 32609479149 PASS.
- [x] Verify the exact merged artifact on `main`, write proof, release the ticket, and clean up the exact worktree/branch. Proof PASS at merged SHA 30c99ffa with clean npm ci, plugin/mcpb parity, scripts 89/89, and hosted run 32609479149.
