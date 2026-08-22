---
id: CORE-062
type: ticket
title: Reconcile board-worktree ignores on local and remote branch attachment paths
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T13:53:22.742Z'
  review: '2026-08-22T14:04:59.392Z'
  verifying: '2026-08-22T14:07:26.918Z'
taken_at: '2026-08-22T13:54:57.294Z'
branch: core-062-attachment-ignore
worktree: .worktrees/core-062
labels:
  - pr-review
  - board-sync
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - b167b667
  - a0acadee
prs:
  - '183'
archived: false
created: '2026-08-22T13:52:30.794Z'
updated: '2026-08-22T14:07:37.213Z'
---

Close CORE-058 review finding: `ensureBoardWorktree` creates the canonical worktree through `localExists` and `remoteExists` paths but only installs the board-worktree ignore rules for orphan creation. Move the shared reconciliation onto every successful creation path and add real-Git regressions proving `.kanmer/data/sources/` is present before sync for local and remote branch attachment. Link [[CORE-058]].
