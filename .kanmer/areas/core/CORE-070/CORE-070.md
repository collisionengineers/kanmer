---
id: CORE-070
type: ticket
title: 'CORE-058 review: enforce effective cache ignore ordering'
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
archived: false
created: '2026-08-22T15:15:55.434Z'
updated: '2026-08-22T15:18:13.569Z'
---

PR #180 thread 3836307987: reconcile managed cache exclusions after later negations or verify effective ignore behavior, so an existing exception cannot make the sources cache trackable; add regression.
