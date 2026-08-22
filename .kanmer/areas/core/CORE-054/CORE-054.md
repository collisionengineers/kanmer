---
id: CORE-054
type: ticket
title: 'CORE-052 review remediation: refuse unexpected branch without auto-rename'
status: verifying
area: core
assignee: codex-core054-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:52:23.815Z'
  implementing: '2026-08-22T12:52:44.944Z'
  review: '2026-08-22T12:58:45.363Z'
  verifying: '2026-08-22T13:16:20.854Z'
taken_at: '2026-08-22T12:52:51.051Z'
branch: core-054-no-rename-mismatch
worktree: .worktrees/core-054
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - HZN-007
links:
  - CORE-052
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 1ef6852a
  - 3964c2ca
  - b7957214
prs:
  - '176'
  - '177'
archived: false
created: '2026-08-22T12:51:54.808Z'
updated: '2026-08-22T13:16:22.526Z'
---

Close CORE-052 review P1: when refresh observes a live board worktree on an unexpected branch, the protected refusal path must not call renameBoardBranch or alter refs/worktree. Preserve the current preference, surface mismatch/paused state, and add an integration regression proving no automatic rename. Link [[CORE-052]].
