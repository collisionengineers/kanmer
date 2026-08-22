---
id: CORE-075
type: ticket
title: 'CORE-071 review: refresh cumulative append-only packet and traceability'
status: implementing
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:57:25.887Z'
  implementing: '2026-08-22T15:57:34.846Z'
taken_at: '2026-08-22T15:57:35.665Z'
branch: core-075-refresh-071-packet
worktree: .worktrees/core-075
labels:
  - pr-review
  - core-071
  - traceability
groups:
  - HZN-007
links:
  - CORE-071
  - CORE-074
blocks:
  - CORE-071
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T15:56:43.960Z'
updated: '2026-08-22T15:57:35.665Z'
---

PR #192 cumulative head c8ee9a4e includes merged CORE-074, but CORE-071 research/plan/checklist/post-implementation-report still describe the superseded compare-and-retry implementation. Refresh the packet to describe append-only O_APPEND merging, preserve the initial failed/full-rail evidence and corrected pass, and update item commits/PR traceability with the reachable CORE-074 commit/PR 193 and cumulative head.
