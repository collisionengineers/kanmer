---
id: CORE-065
type: ticket
title: 'CORE-058 review: keep ignore reconciliation failures retryable'
status: review
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T14:46:30.768Z'
  review: '2026-08-22T14:52:32.882Z'
taken_at: '2026-08-22T14:46:31.706Z'
branch: core-065-retry-ignore-reconciliation
worktree: .worktrees/core-065
labels:
  - pr-review
  - board-sync
  - review-finding
groups:
  - HZN-007
links:
  - CORE-058
blocks:
  - CORE-058
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 3ffa713f8cc943530d6172d4afbd922d59ebb328
prs:
  - '186'
archived: false
created: '2026-08-22T14:30:31.050Z'
updated: '2026-08-22T14:52:32.882Z'
---

Review finding from PR #180 head b1abac871da28522759d4e5582caa69d5cdb5 (thread 3836232929). The attached-worktree failure returns available:false, boardRoot set, paused:true; Settings renders the non-Git message and syncBoard short-circuits on unavailable, so repairing .gitignore cannot be retried without reopening. Preserve a distinct failed-Git state that surfaces the error and permits retry/reconciliation, with deterministic UI/status and idempotence coverage. Child of [[CORE-058]].
