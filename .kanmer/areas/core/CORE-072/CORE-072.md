---
id: CORE-072
type: ticket
title: 'CORE-058 review: resume orphan migration after retry'
status: backlog
area: core
assignee: ''
profile: fix
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
docs_todo: true
archived: false
created: '2026-08-22T15:15:55.500Z'
updated: '2026-08-22T15:15:55.500Z'
---

PR #180 thread 3836323268: when orphan creation copied the source board and ignore repair failed, a later retry must complete the source-board cleanup/migration rather than only repairing .gitignore; add regression under FRD-020 R2.
