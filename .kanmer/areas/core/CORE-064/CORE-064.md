---
id: CORE-064
type: ticket
title: 'CORE-058 review: preserve board root after rename reconciliation failure'
status: implementing
area: core
assignee: ''
profile: fix
stageEntered:
  implementing: '2026-08-22T14:37:37.353Z'
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
archived: false
created: '2026-08-22T14:30:26.978Z'
updated: '2026-08-22T14:37:37.353Z'
---

Review finding from PR #180 head b1abac871da28522759d4e5582caa69d5cdb5cd5 (thread 3836232925). When the existing board worktree is on an old branch, renameBoardBranch can succeed before ensureBoardWorktreeIgnore fails; the outer catch returns empty() with boardRoot null and openProject can fall back to the source checkout. Preserve the canonical boardRoot with paused/error state and add a deterministic regression. Child of [[CORE-058]].
