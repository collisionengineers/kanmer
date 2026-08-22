---
id: CORE-049
type: ticket
title: >-
  CORE-046 review remediation: bounded quarantine rename retry and cumulative
  traceability
status: implementing
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T11:33:25.135Z'
taken_at: '2026-08-22T11:34:03.989Z'
branch: core-049-quarantine-rename-retry
worktree: .worktrees/core-049
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-046
blocks:
  - CORE-046
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 8edfede9bdb663171601cb326a67bd03792065e2
prs:
  - '171'
archived: false
created: '2026-08-22T11:33:00.536Z'
updated: '2026-08-22T11:41:36.305Z'
---

Remediate independent CORE-046 review blockers: route stale-lock quarantine renames through the existing bounded Windows retry contract (EPERM/EBUSY/EACCES) with regression coverage; refresh the cumulative post-child report and exact reachable commit metadata; and disposition the fixed original PR thread after evidence is updated. Preserve CORE-047 token/lease behavior, inherited source DNS policy, and explicit live Windows/crash INCONCLUSIVE boundaries. Link [[CORE-046]].
