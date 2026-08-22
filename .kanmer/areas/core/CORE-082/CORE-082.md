---
id: CORE-082
type: ticket
title: 'CORE-026 review: close lock ownership and Git artifact isolation gaps'
status: review
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T19:33:34.538Z'
  review: '2026-08-22T19:54:41.281Z'
taken_at: '2026-08-22T19:37:50.975Z'
branch: core-082-lock-git-isolation
worktree: .worktrees/core-082
labels:
  - remediation
  - review
  - sources
groups:
  - HZN-006
  - HZN-007
links:
  - CORE-026
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 388a1b28
prs:
  - '209'
archived: false
created: '2026-08-22T18:00:07.493Z'
updated: '2026-08-22T19:54:41.281Z'
---

Blocking remediation from the current-head audit of PR #163 (3a05ab7a21f55152a4f493169300ac9e622baab7). Resolve newest valid inline findings #3836536186 (PID reuse is not distinguished from the crashed owner), #3836612412 (malformed stale lock records never recover), and #3836612414 (board lock/owner/quarantine artifacts are not excluded from Git synchronization). Preserve fail-closed live-owner behavior, add deterministic ownership/recovery and board-sync regressions, and update the cumulative CORE-026 packet. This ticket is linked to and blocks [[CORE-026]].
