---
id: CORE-071
type: ticket
title: 'CORE-058 review: preserve concurrent .gitignore edits'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:38:25.032Z'
  implementing: '2026-08-22T15:41:04.025Z'
  review: '2026-08-22T15:44:22.859Z'
  verifying: '2026-08-22T15:59:24.591Z'
  done: '2026-08-23T00:03:53.731Z'
taken_at: '2026-08-22T15:41:04.913Z'
branch: core-071-preserve-ignore-edits
worktree: .worktrees/core-071
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
  - 37bc2265
  - 59e7e0fe
  - c8ee9a4e
  - cbb152da
prs:
  - '192'
  - '193'
archived: false
created: '2026-08-22T15:15:55.463Z'
updated: '2026-08-23T00:03:53.744Z'
---

PR #180 thread 3836307988: make ignore reconciliation compare-and-retry or lock/merge safely so a concurrent human/process update is not overwritten by a stale read; add deterministic race regression.

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #192 merged at cbb152dae4effc6fe0db254a59639818e2915b44; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
