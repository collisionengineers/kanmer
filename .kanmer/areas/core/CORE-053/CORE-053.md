---
id: CORE-053
type: ticket
title: 'CORE-051 review remediation: surface claimant-marker cleanup failures'
status: backlog
area: core
assignee: ''
profile: fix
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
archived: false
created: '2026-08-22T12:38:15.586Z'
updated: '2026-08-22T12:38:15.586Z'
---

Close PR #173 review finding: when lock cleanup read fails and removing the claimant marker also fails, surface or combine the cleanup error instead of discarding it and leaving a marker that blocks later claimants. Add deterministic regression and preserve exact CORE-051/CORE-045 cumulative traceability. Link [[CORE-051]].
