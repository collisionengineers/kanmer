---
id: CORE-043
type: ticket
title: Retarget branch protection when the Kanmer board branch is renamed
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T10:43:27.609Z'
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
archived: false
created: '2026-08-22T06:48:09.524Z'
updated: '2026-08-22T10:43:27.609Z'
---

Deferred from CORE-033 review finding: GUI board-branch rename pushes the new branch and deletes the old one, while protection targets literal kanmer-board and forbids deletion. Coordinate protection retargeting or explicitly constrain the supported rename flow so the live board branch cannot become unprotected and stale protection is not left behind. Link [[CORE-033]].
