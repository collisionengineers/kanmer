---
id: CORE-069
type: ticket
title: 'CORE-058 review: retry the current saved board branch'
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
created: '2026-08-22T15:15:55.407Z'
updated: '2026-08-22T15:18:12.734Z'
---

PR #180 thread 3836307986: when settings change the board branch while the project is paused, retry must use the current saved branch (or explicitly update the paused state) rather than retrying the stale branch; add regression.
