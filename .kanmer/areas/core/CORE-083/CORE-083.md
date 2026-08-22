---
id: CORE-083
type: ticket
title: 'CORE-026 review: preserve source board state during orphan migration failures'
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T19:57:31.666Z'
  review: '2026-08-22T20:15:50.868Z'
  verifying: '2026-08-22T20:41:35.341Z'
taken_at: '2026-08-22T20:03:15.463Z'
branch: core-083-orphan-board-state
worktree: .worktrees/core-083
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
  - ff12510be5608a6b940f15c00e2cb68dc0266267
  - f65ac4178de978a01a44e32235c2cdfacddc6a6f
prs:
  - '211'
archived: false
created: '2026-08-22T18:00:07.526Z'
updated: '2026-08-22T20:41:35.341Z'
---

Blocking remediation from the current-head audit of PR #163 (3a05ab7a21f55152a4f493169300ac9e622baab7). Resolve newest valid inline findings #3836536180 (do not delete newer source-board edits before orphan cleanup has verified the copied source version) and #3836536184 (retain the canonical board root when source-root ignore reconciliation refuses a symlink). Add real-Git/deterministic regressions for source-version conflict and source-ignore failure, preserve paused/error state, and update the cumulative CORE-026 packet. This ticket is linked to and blocks [[CORE-026]].
