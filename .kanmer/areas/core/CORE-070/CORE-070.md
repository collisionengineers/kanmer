---
id: CORE-070
type: ticket
title: 'CORE-058 review: enforce effective cache ignore ordering'
status: implementing
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:34:13.833Z'
  implementing: '2026-08-22T15:35:16.831Z'
taken_at: '2026-08-22T15:35:17.712Z'
branch: core-070-effective-cache-ignore
worktree: .worktrees/core-070
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
archived: false
created: '2026-08-22T15:15:55.434Z'
updated: '2026-08-22T15:35:17.712Z'
---

PR #180 thread 3836307987: reconcile managed cache exclusions after later negations or verify effective ignore behavior, so an existing exception cannot make the sources cache trackable; add regression.
