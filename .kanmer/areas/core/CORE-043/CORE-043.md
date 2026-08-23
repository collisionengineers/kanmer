---
id: CORE-043
type: ticket
title: Retarget branch protection when the Kanmer board branch is renamed
status: done
area: core
assignee: core041-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T10:43:27.609Z'
  review: '2026-08-22T10:53:15.286Z'
  verifying: '2026-08-22T23:24:37.632Z'
  done: '2026-08-23T00:26:13.229Z'
labels:
  - follow-up
  - branch-protection
  - board-sync
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-033
blocks: []
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
  - f63d953fc8467440988c887c62a34ade0c77c96c
  - 0e1be5f32efad1da57ee27bd2a2fe80033976bd1
  - 7cca4bf9e799aa161b6e5da879e6ad942b13154c
  - e78323d7fb8ce695e40db80380d189e236726b25
  - 69ca8883f1acb7762926fb543791117967940ab1
  - aa33ae1aa0d493787d09ff587298274d6523b833
  - 1126253eed586111db60ed72eccf6754f0f5ef06
  - 7654a28104fbc67c58cad61241188d0f3d898c17
  - 94d9fca2a9aa6e9158f7b230cea4617accb771dd
  - 1ef324c06d76af63cae220fe3a0e1dd84160dfd4
  - 9519e2e8ad9c0424b63d9b9d8c4e6ef2832a7401
  - b59fad2f819e38b686df439362a93d6bee588839
  - a8cc6b01ca95340f1186bccc9770238036d080d8
prs:
  - '168'
  - '170'
  - '175'
  - '176'
  - '177'
  - '181'
  - '182'
  - '197'
  - '201'
  - '203'
  - '212'
  - '214'
  - '215'
  - '219'
  - '221'
  - '222'
  - '223'
archived: false
created: '2026-08-22T06:48:09.524Z'
updated: '2026-08-23T00:26:17.753Z'
---

Deferred from CORE-033 review finding: GUI board-branch rename pushes the new branch and deletes the old one, while protection targets literal kanmer-board and forbids deletion. Coordinate protection retargeting or explicitly constrain the supported rename flow so the live board branch cannot become unprotected and stale protection is not left behind. Link [[CORE-033]].
