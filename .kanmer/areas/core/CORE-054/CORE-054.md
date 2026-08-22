---
id: CORE-054
type: ticket
title: 'CORE-052 review remediation: refuse unexpected branch without auto-rename'
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T12:52:23.815Z'
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - HZN-007
links:
  - CORE-052
blocks:
  - CORE-052
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T12:51:54.808Z'
updated: '2026-08-22T12:52:23.815Z'
---

Close CORE-052 review P1: when refresh observes a live board worktree on an unexpected branch, the protected refusal path must not call renameBoardBranch or alter refs/worktree. Preserve the current preference, surface mismatch/paused state, and add an integration regression proving no automatic rename. Link [[CORE-052]].
