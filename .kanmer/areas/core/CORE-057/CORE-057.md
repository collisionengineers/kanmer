---
id: CORE-057
type: ticket
title: 'CORE-044 review remediation: pin DNS validation and bound resolver timeout'
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - sources
  - security
groups:
  - HZN-007
links:
  - CORE-044
blocks:
  - CORE-044
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T13:03:00.897Z'
updated: '2026-08-22T13:03:00.897Z'
---

Close CORE-044 remote-source review findings: ensure the outbound request is bound to the address validated by the public-destination preflight (or implement a governing-document-backed safe equivalent), and enforce the documented fetch deadline across DNS resolution. Add deterministic regression coverage and preserve surfaced errors. Link [[CORE-044]].
