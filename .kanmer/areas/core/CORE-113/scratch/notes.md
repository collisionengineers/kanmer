## 2026-08-27 — operator disposition: supersede CORE-113

Operator decision (recorded by Claude on the operator's instruction, board 8a23c906, PR #286 head db63fb4b150e956dafb88c75c99ff3088a0b72cc):

- CORE-113 is superseded. Mutable reconciliation depends on a document-inclusive revision (CORE-114) and expiring claims/leases (CORE-115) that do not exist yet; F-015 is not closable inside this ticket's scope.
- PR #286 is closed unmerged. Branch `core-113-rescue-reconciliation` and worktree `.worktrees/core-113` are retained as reference; the read-only classifier/collector/tests are to be salvaged into a read-only inspector ticket. `apply_reconciliation` must not merge before CORE-114/115.
- Claim released by the operator (no force). Recorded execution location before release: branch `core-113-rescue-reconciliation`, worktree `.worktrees/core-113`, controller `codex-goal-controller`, taken 2026-08-26T21:48:26.729Z.
- Ticket moved Review → Backlog and archived with an Outcome pointing to the successor tickets.
- Successor order: bootstrap ownership/backward-move contract → read-only inspector, merge-gate/board-sync hardening, review-consolidation skill contract (parallel) → CORE-114 → CORE-115 → mutating reconciliation.
- The exact-head kanmer-gate failures (runs 33022209622/33022222769/33022278471) evaluated stale board f3d9044d; they are no longer current but are moot once the PR is closed.
- The review attestation at db63fb4b predates Codex round 3 (23:12:14Z) and omits four current P1 threads (git-common-dir, missing-worktree merged recovery, verification-failure routing, expired-claim classification); those are carried into the successor tickets.
