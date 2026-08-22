---
id: CORE-079
type: ticket
title: 'CORE-026 review: normalize Windows board-root path assertions'
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - core-026
  - hosted-gate
  - automated-review
links:
  - CORE-026
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T17:01:33.221Z'
updated: '2026-08-22T17:01:33.221Z'
---

Hosted verify run 32585991850/job 97062323619 failed three apps/gui kanmerGit tests at cumulative CORE-026 head e794cbf7. The implementation returns canonical long temp paths while expectations use Windows 8.3 RUNNER~1 spelling. Normalize board-root assertions through the existing pathIdentity helper and rerun the authoritative verify rail.
