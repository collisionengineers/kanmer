---
id: CORE-076
type: ticket
title: 'CORE-072 review: retry source cleanup after board commit'
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - core-072
  - automated-review
groups:
  - HZN-007
links:
  - CORE-072
blocks:
  - CORE-072
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
docs_todo: true
archived: false
created: '2026-08-22T16:06:10.232Z'
updated: '2026-08-22T16:06:10.232Z'
---

PR #194 review finding: resumeOrphanMigration returns immediately when the board already has HEAD. If the first commit/push succeeded but source cleanup git rm failed, a later retry sees HEAD and never retries cleanup, leaving the source .kanmer tree as a stale second board. Make finalization idempotently retry cleanup after commit/push and add a deterministic post-commit cleanup failure regression.
