---
id: CORE-078
type: ticket
title: 'CORE-060 review: re-arm timer after successful manual retry'
status: review
area: core
assignee: codex-core078-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T16:56:06.287Z'
  implementing: '2026-08-22T16:57:57.652Z'
  review: '2026-08-22T17:03:00.920Z'
taken_at: '2026-08-22T16:57:58.471Z'
branch: core-078-rearm-manual-retry
worktree: .worktrees/core-078
labels:
  - pr-review
  - core-060
  - automated-review
links:
  - CORE-060
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 7b355245c7755ccf9a08bfa13394b6834a8a7f61
  - f44b6fd842488ee363b561fa1bc7e40d7ebcad7b
prs:
  - '199'
archived: false
created: '2026-08-22T16:44:56.818Z'
updated: '2026-08-22T17:06:28.331Z'
---

PR #197 review finding: a successful manual retry clears the paused state but does not re-arm the already-cleared automatic-sync timer. Restore the timer on a successful retry and add a deterministic regression.
