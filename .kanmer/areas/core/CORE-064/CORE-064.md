---
id: CORE-064
type: ticket
title: 'CORE-058 review: preserve board root after rename reconciliation failure'
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T14:37:37.353Z'
  review: '2026-08-22T14:42:52.638Z'
  verifying: '2026-08-22T14:45:26.658Z'
taken_at: '2026-08-22T14:37:46.900Z'
branch: core-064-preserve-root-rename
worktree: .worktrees/core-064
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
  - c8efb926c29a0edc9a17764b47e6d680d9aedf86
  - 17cdb6684f204e36cb64668236a4bab0de7e55ac
prs:
  - '185'
archived: false
created: '2026-08-22T14:30:26.978Z'
updated: '2026-08-22T14:45:26.658Z'
---

Review finding from PR #180 head b1abac871da28522759d4e5582caa69d5cdb5cd5 (thread 3836232925). When the existing board worktree is on an old branch, renameBoardBranch can succeed before ensureBoardWorktreeIgnore fails; the outer catch returns empty() with boardRoot null and openProject can fall back to the source checkout. Preserve the canonical boardRoot with paused/error state and add a deterministic regression. Child of [[CORE-058]].
