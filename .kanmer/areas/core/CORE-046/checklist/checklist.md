# CORE-046 checklist

- [x] Replace stale-lock unlink with atomic exact-inode quarantine/rename.
- [x] Add deterministic concurrent-reclaimer regression without deleting inherited assertions.
- [x] Add fail-closed IPv6 classification for 64:ff9b:1::/48.
- [x] Add fail-closed IPv6 classification for 100:0:0:1::/64 and 5f00::/16.
- [x] Add deterministic tests preserving mapped/special-use/public destination coverage.
- [x] Run focused/shared rails and record exact exit codes.
- [x] Write post-implementation report and Review scratch handoff.
- [x] Record commit/PR traceability, confirm gates, and move to Review.

- [x] Reject IPv4 192.175.48.0/24 and prove DNS lookup on redirect and linked hops.

## Merged-main verification / closeout

- [x] All recorded commits reachable from origin/main fdaededc and merged-main proof written.
- [x] IO/source/core/store/typecheck/scripts/docs/skills/agents/diff rails recorded; HTTP timeout and depth-sensitive plugin comparison preserved INCONCLUSIVE.
- [ ] Exact worktree/branch cleanup and release pending.
