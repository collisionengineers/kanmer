---
id: CORE-050
type: ticket
title: >-
  CORE-049 review remediation: revalidate quarantine ownership and harden lock
  cleanup
status: review
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T11:50:45.398Z'
  review: '2026-08-22T12:04:00.542Z'
taken_at: '2026-08-22T11:51:34.118Z'
branch: core-050-lock-revalidation
worktree: .worktrees/core-050
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-049
  - CORE-046
blocks:
  - CORE-049
  - CORE-046
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - fc8e591e344cb7743204f8261eb5186b76f1d3aa
prs:
  - '172'
archived: false
created: '2026-08-22T11:50:22.655Z'
updated: '2026-08-22T12:04:00.542Z'
---

Close the remaining cumulative source-lock review blockers: on every transient quarantine-rename retry, repeat stale inode and owner-marker validation before acting; preserve active replacement locks against third-claimant overlap; surface cleanup errors instead of broad suppression; validate persisted lock tokens before owner-marker path construction. Add adversarial regressions, preserve CORE-047/049 behavior and plugin parity, and disposition the related PR #167 threads with evidence. Link [[CORE-049]] and [[CORE-046]].
