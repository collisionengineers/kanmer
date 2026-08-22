---
id: CORE-043
type: ticket
title: Retarget branch protection when the Kanmer board branch is renamed
status: review
area: core
assignee: core041-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T10:43:27.609Z'
  review: '2026-08-22T10:53:15.286Z'
taken_at: '2026-08-22T10:44:37.700Z'
branch: core-043-protection-retarget
worktree: .worktrees/core-043
labels:
  - follow-up
  - branch-protection
  - board-sync
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-033
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
docs_todo: true
commits:
  - 1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6
  - 11930038542d402865bb26a23787d7d3cad3e2c5
prs:
  - '168'
  - '170'
archived: false
created: '2026-08-22T06:48:09.524Z'
updated: '2026-08-22T12:04:34.929Z'
---

Deferred from CORE-033 review finding: GUI board-branch rename pushes the new branch and deletes the old one, while protection targets literal kanmer-board and forbids deletion. Coordinate protection retargeting or explicitly constrain the supported rename flow so the live board branch cannot become unprotected and stale protection is not left behind. Link [[CORE-033]].
