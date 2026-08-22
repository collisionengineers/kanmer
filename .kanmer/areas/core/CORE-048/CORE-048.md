---
id: CORE-048
type: ticket
title: 'CORE-043 review remediation: refresh board branch state and hosted gate'
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-043
blocks:
  - CORE-043
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T11:26:12.810Z'
updated: '2026-08-22T11:26:12.810Z'
---

Remediate independent CORE-043 review blockers before merge: refresh cached syncStatus.branch after administrator handoff while the project stays open; clear or invalidate branch preference when no Git board is open; and remove the literal kanmer-board assumption from .github/workflows/pr.yml so the documented custom branch workflow keeps the hosted verify gate. Preserve ADR-0016 conservative protection inference as an explicit accepted risk. Link [[CORE-043]].
