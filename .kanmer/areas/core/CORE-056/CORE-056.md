---
id: CORE-056
type: ticket
title: >-
  CORE-044 review remediation: serialize refresh and complete 304 linked
  revalidation
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - sources
  - concurrency
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
created: '2026-08-22T13:03:00.858Z'
updated: '2026-08-22T13:03:00.858Z'
---

Close CORE-044 review findings for source refresh correctness: serialize per-source read/fetch/write refreshes or use version/CAS conflict handling; charge retained cached bytes on root 304 against the aggregate budget; rediscover and retry missing linked pages when revalidating an unchanged root; preserve bounded behavior and add exact-head regression coverage. Link [[CORE-044]].
