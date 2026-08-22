---
id: CORE-056
type: ticket
title: >-
  CORE-044 review remediation: serialize refresh and complete 304 linked
  revalidation
status: verifying
area: core
assignee: codex-core056-take
profile: fix
stageEntered:
  preparing: '2026-08-22T13:05:56.530Z'
  review: '2026-08-22T13:19:49.812Z'
  verifying: '2026-08-22T13:25:10.920Z'
taken_at: '2026-08-22T13:06:42.597Z'
branch: core-056-source-refresh
worktree: .worktrees/core-056
labels:
  - pr-review
  - sources
  - concurrency
groups:
  - HZN-007
links:
  - CORE-044
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 69860063c583eaecb1cee9c679ded4abb6eb96dd
prs:
  - '179'
archived: false
created: '2026-08-22T13:03:00.858Z'
updated: '2026-08-22T13:25:13.318Z'
---

Close CORE-044 review findings for source refresh correctness: serialize per-source read/fetch/write refreshes or use version/CAS conflict handling; charge retained cached bytes on root 304 against the aggregate budget; rediscover and retry missing linked pages when revalidating an unchanged root; preserve bounded behavior and add exact-head regression coverage. Link [[CORE-044]].
