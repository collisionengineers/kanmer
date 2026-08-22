---
id: CORE-073
type: ticket
title: 'CORE-058 review: bind retry to the open board root'
status: review
area: core
assignee: codex
profile: fix
stageEntered:
  preparing: '2026-08-22T16:05:54.186Z'
  implementing: '2026-08-22T16:07:21.785Z'
  review: '2026-08-22T16:13:56.692Z'
taken_at: '2026-08-22T16:07:37.658Z'
branch: core-073-bind-open-board-root
worktree: .worktrees/core-073
labels:
  - pr-review
  - core-058
  - automated-review
groups:
  - HZN-007
links:
  - CORE-058
blocks:
  - CORE-058
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 3b4ef44ace5d077c7e54d5ed289d477fa7f6b529
prs:
  - '195'
archived: false
created: '2026-08-22T15:15:55.538Z'
updated: '2026-08-22T16:13:56.692Z'
---

PR #180 thread 3836323269: reject a retry result whose boardRoot differs from the open context (or rebuild the whole context) so sync/store/watcher cannot operate on another worktree; add regression.
