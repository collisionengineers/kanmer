---
id: CORE-065
type: ticket
title: 'CORE-058 review: keep ignore reconciliation failures retryable'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T14:46:30.768Z'
  review: '2026-08-22T14:52:32.882Z'
  verifying: '2026-08-22T14:55:02.775Z'
  done: '2026-08-23T00:03:48.953Z'
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
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 3ffa713f8cc943530d6172d4afbd922d59ebb328
  - b8d8a191161532e895fa399b6c95bf812dfdb2d0
prs:
  - '186'
archived: false
created: '2026-08-22T14:30:31.050Z'
updated: '2026-08-23T00:03:48.967Z'
---

Review finding from PR #180 head b1abac871da28522759d4e5582caa69d5cdb5 (thread 3836232929). The attached-worktree failure returns available:false, boardRoot set, paused:true; Settings renders the non-Git message and syncBoard short-circuits on unavailable, so repairing .gitignore cannot be retried without reopening. Preserve a distinct failed-Git state that surfaces the error and permits retry/reconciliation, with deterministic UI/status and idempotence coverage. Child of [[CORE-058]].

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #186 merged at b8d8a191161532e895fa399b6c95bf812dfdb2d0; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
