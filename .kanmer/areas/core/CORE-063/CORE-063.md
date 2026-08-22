---
id: CORE-063
type: ticket
title: Preserve the board root when ignore reconciliation fails
status: implementing
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T13:54:05.842Z'
taken_at: '2026-08-22T14:09:21.903Z'
branch: core-063-preserve-board-root
worktree: .worktrees/core-063
labels:
  - pr-review
  - board-sync
groups:
  - HZN-007
links:
  - CORE-058
blocks:
  - CORE-058
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T13:52:34.564Z'
updated: '2026-08-22T14:09:21.903Z'
---

Close CORE-058 review finding: if an attached board-worktree `.gitignore` cannot be reconciled (for example a Windows lock or permission failure), `ensureBoardWorktree` must return the known `boardRoot` with an actionable error/paused state instead of falling through to `empty()` and making callers fall back to the source checkout. Add a deterministic failure regression. Link [[CORE-058]].
