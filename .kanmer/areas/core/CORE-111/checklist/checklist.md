# Checklist

- [x] Confirm PR #281 final head has an independent pass, green required checks, and merges into main; confirm #282 merge SHA remains reachable.
- [x] Create and validate the clean CORE-111 release worktree from current origin/main without touching the dirty source root.
- [x] Write v0.3.12-only stabilization release notes.
- [ ] Run the complete real release command for 0.3.12 and preserve every command exit.
- [ ] Verify plugin/MCP synchronization and all local/remote installer, blockmap, updater-manifest, size, and SHA-256 evidence.
- [ ] Run supported installed launcher/Connect smoke and pin packaged v0.3.12 as the live server.
- [ ] Reconcile GUI-142, MCP-053, and CORE-111 with exact GitHub and board state.
- [ ] Write proof and clean the release branch, worktree, and claim.
