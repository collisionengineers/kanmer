---
id: CORE-078
type: ticket
title: 'CORE-060 review: re-arm timer after successful manual retry'
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - core-060
  - automated-review
links:
  - CORE-060
blocks:
  - CORE-060
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T16:44:56.818Z'
updated: '2026-08-22T16:44:56.818Z'
---

PR #197 review finding: a successful manual retry clears the paused state but does not re-arm the already-cleared automatic-sync timer. Restore the timer on a successful retry and add a deterministic regression.
