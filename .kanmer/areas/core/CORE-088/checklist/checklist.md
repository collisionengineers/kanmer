# CORE-088 checklist

- [x] Confirm exact CORE-026 cumulative base and isolated worktree/branch. (Recorded packet named 453a9209; current parent advanced to f2e694a4 before worktree creation, so this lane uses the reachable current parent head.)
- [x] Read the full ticket/group packet and governing docs.
- [ ] Harden cache validation, stale fallback, force refresh, bounded reads, origins, and 304 validators.
- [ ] Handle Node DNS lookup all-mode callback shape without weakening public-destination policy.
- [ ] Make orphan cleanup fingerprint-and-delete atomic under the existing lock.
- [ ] Add deterministic regressions for every scoped finding.
- [ ] Run focused and workspace rails; preserve first failures and INCONCLUSIVE boundaries.
- [ ] Update post-implementation report and cumulative CORE-026 packet.
- [ ] Open linked PR and hand off at Review; leave merged-main proof unchecked.
- [ ] Verify merged-main proof after independent review and merge.
