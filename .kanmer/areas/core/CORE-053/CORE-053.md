---
id: CORE-053
type: ticket
title: 'CORE-051 review remediation: surface claimant-marker cleanup failures'
status: verifying
area: core
assignee: codex-core053-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:38:42.067Z'
  implementing: '2026-08-22T12:38:50.773Z'
  review: '2026-08-22T12:45:44.063Z'
  verifying: '2026-08-22T12:48:37.313Z'
taken_at: '2026-08-22T12:38:55.221Z'
branch: core-053-marker-cleanup-error
worktree: .worktrees/core-053
labels:
  - pr-review
  - concurrency
  - windows
groups:
  - HZN-007
links:
  - CORE-051
blocks:
  - CORE-051
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 695e12ee659b927513c7e0190a81d5ecb9e8c513
  - 36b57a93b6b22f10672d571fb68c160d4766cfc5
prs:
  - '174'
archived: false
created: '2026-08-22T12:38:15.586Z'
updated: '2026-08-22T12:48:37.313Z'
---

Close PR #173 review finding: when lock cleanup read fails and removing the claimant marker also fails, surface or combine the cleanup error instead of discarding it and leaving a marker that blocks later claimants. Add deterministic regression and preserve exact CORE-051/CORE-045 cumulative traceability. Link [[CORE-051]].
