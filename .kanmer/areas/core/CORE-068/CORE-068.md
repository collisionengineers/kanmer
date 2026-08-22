---
id: CORE-068
type: ticket
title: 'CORE-058 review: re-arm automatic sync after ignore-repair retry'
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T15:18:23.125Z'
  review: '2026-08-22T15:27:25.220Z'
  verifying: '2026-08-22T15:29:20.714Z'
taken_at: '2026-08-22T15:18:23.976Z'
branch: core-068-rearm-sync-retry
worktree: .worktrees/core-068
labels:
  - pr-review
  - core-058
  - automated-review
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - c90d056d
  - 14c2d0fd
prs:
  - '189'
archived: false
created: '2026-08-22T15:15:55.378Z'
updated: '2026-08-22T15:29:25.862Z'
---

PR #180 thread 3836307985: when retry repairs a temporarily unavailable board worktree, restore the automatic sync timer for the already-enabled interval; add a deterministic regression and preserve the paused/retry state semantics.
