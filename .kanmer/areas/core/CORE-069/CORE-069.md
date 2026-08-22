---
id: CORE-069
type: ticket
title: 'CORE-058 review: retry the current saved board branch'
status: review
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:29:02.242Z'
  implementing: '2026-08-22T15:29:37.661Z'
  review: '2026-08-22T15:33:53.015Z'
taken_at: '2026-08-22T15:29:45.571Z'
branch: core-069-retry-current-branch
worktree: .worktrees/core-069
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
  - a6231bb0
prs:
  - '190'
archived: false
created: '2026-08-22T15:15:55.407Z'
updated: '2026-08-22T15:33:53.015Z'
---

PR #180 thread 3836307986: when settings change the board branch while the project is paused, retry must use the current saved branch (or explicitly update the paused state) rather than retrying the stale branch; add regression.
