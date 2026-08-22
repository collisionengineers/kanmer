---
id: CORE-051
type: ticket
title: >-
  CORE-045 review remediation: narrow destination predicates and propagate
  recovery errors
status: review
area: core
assignee: codex-core051-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:19:13.064Z'
  review: '2026-08-22T12:36:53.591Z'
taken_at: '2026-08-22T12:23:15.192Z'
branch: core-051-destination-error-remediation
worktree: .worktrees/core-051
labels:
  - pr-review
  - security
  - ssrf
  - concurrency
groups:
  - HZN-007
links:
  - CORE-045
blocks:
  - CORE-045
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 5cd42532b1ff9514655a5713d69a6507921d1b5f
  - 6f206ae3ae4ef3d7d6bae5106081b1d233e864fb
  - 67a066d351e3f7924f87f7580a74c98e7b94cbb2
  - 695e12ee659b927513c7e0190a81d5ecb9e8c513
prs:
  - '173'
  - '174'
archived: false
created: '2026-08-22T12:18:46.999Z'
updated: '2026-08-22T12:45:43.803Z'
---

Close remaining CORE-045 cumulative review blockers: narrow IPv4 special-use predicates to only non-global subranges while retaining public exceptions; match 3fff::/20 rather than 3fff::/16; propagate the actionable final claim error after stale recovery instead of the original EEXIST. Add deterministic regressions, refresh CORE-045 cumulative report/item traceability to head 0f9af92b and child lineage, and resolve the related PR #166 threads with evidence. Link [[CORE-045]].
