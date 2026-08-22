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
commits:
  - 1a06ead1
  - 8ffff2a0
  - '11930038'
  - 825fb79d
  - 1ef6852a
  - 3964c2ca
  - b7957214
  - f4705d9e
  - 4f106865
  - 216dcdf0
  - 8c093424
  - 835f9f51
  - 94f7094b
prs:
  - '168'
  - '170'
  - '175'
  - '176'
  - '177'
  - '181'
  - '182'
archived: false
created: '2026-08-22T06:48:09.524Z'
updated: '2026-08-22T13:55:48.738Z'
---

Deferred from CORE-033 review finding: GUI board-branch rename pushes the new branch and deletes the old one, while protection targets literal kanmer-board and forbids deletion. Coordinate protection retargeting or explicitly constrain the supported rename flow so the live board branch cannot become unprotected and stale protection is not left behind. Link [[CORE-033]].
