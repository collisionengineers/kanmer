# CORE-088 checklist

- [x] Confirm exact CORE-026 cumulative base and isolated worktree/branch. (Recorded packet named 453a9209; current parent advanced to f2e694a4 before worktree creation, so this lane uses the reachable current parent head.)
- [x] Read the full ticket/group packet and governing docs.
- [x] Harden cache validation, stale fallback, force refresh, bounded reads, origins, and 304 validators.
- [x] Handle Node DNS lookup all-mode callback shape without weakening public-destination policy.
- [x] Make orphan cleanup fingerprint-and-delete atomic under the existing lock.
- [x] Add deterministic regressions for every scoped finding.
- [x] Run focused and workspace rails; preserve first failures and INCONCLUSIVE boundaries. (Sources 32/32, core IO 32/32, GUI Git 31/31, full typecheck exit 0, docs exit 0; plugin:check and mcpb:check preserved as linked-worktree/dependency INCONCLUSIVE.)
- [x] Update post-implementation report and cumulative CORE-026 packet.
- [x] Open linked PR #218 and hand off at Review; leave merged-main proof unchecked.
- [x] Verify merged-main proof after independent review and merge. — reconciled against merged-main proof; linked-worktree/dependency limits remain recorded.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
