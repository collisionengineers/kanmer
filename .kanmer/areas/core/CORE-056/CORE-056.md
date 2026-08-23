---
id: CORE-056
type: ticket
title: >-
  CORE-044 review remediation: serialize refresh and complete 304 linked
  revalidation
status: done
area: core
assignee: codex-core056-take
profile: fix
stageEntered:
  preparing: '2026-08-22T13:05:56.530Z'
  review: '2026-08-22T13:19:49.812Z'
  verifying: '2026-08-22T13:25:10.920Z'
  done: '2026-08-23T00:42:03.828Z'
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
updated: '2026-08-23T00:45:25.642Z'
---

Close CORE-044 review findings for source refresh correctness: serialize per-source read/fetch/write refreshes or use version/CAS conflict handling; charge retained cached bytes on root 304 against the aggregate budget; rediscover and retry missing linked pages when revalidating an unchanged root; preserve bounded behavior and add exact-head regression coverage. Link [[CORE-044]].


## Closeout outcome

PR #179 (https://github.com/collisionengineers/kanmer/pull/179) merged 2026-08-22T13:24:55Z. Recorded merged-main proof on origin/main a8cc6b01; deterministic evidence and explicit INCONCLUSIVE boundaries are in proof.md.
