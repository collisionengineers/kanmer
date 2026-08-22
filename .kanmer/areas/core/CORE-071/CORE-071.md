---
id: CORE-071
type: ticket
title: 'CORE-058 review: preserve concurrent .gitignore edits'
status: review
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:38:25.032Z'
  implementing: '2026-08-22T15:41:04.025Z'
  review: '2026-08-22T15:44:22.859Z'
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
blocks:
  - CORE-058
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 37bc2265
prs:
  - '192'
archived: false
created: '2026-08-22T15:15:55.463Z'
updated: '2026-08-22T15:44:22.859Z'
---

PR #180 thread 3836307988: make ignore reconciliation compare-and-retry or lock/merge safely so a concurrent human/process update is not overwritten by a stale read; add deterministic race regression.
