---
id: CORE-051
type: ticket
title: >-
  CORE-045 review remediation: narrow destination predicates and propagate
  recovery errors
status: done
area: core
assignee: codex-core051-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:19:13.064Z'
  review: '2026-08-22T12:36:53.591Z'
  verifying: '2026-08-22T12:52:16.445Z'
  done: '2026-08-23T00:42:02.436Z'
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
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 5cd42532b1ff9514655a5713d69a6507921d1b5f
  - 6f206ae3ae4ef3d7d6bae5106081b1d233e864fb
  - 67a066d351e3f7924f87f7580a74c98e7b94cbb2
  - 695e12ee659b927513c7e0190a81d5ecb9e8c513
  - 36b57a93b6b22f10672d571fb68c160d4766cfc5
  - 02389045b7d26ad46e470af1d96a3084b486bf68
prs:
  - '173'
  - '174'
archived: false
created: '2026-08-22T12:18:46.999Z'
updated: '2026-08-23T00:42:34.197Z'
---

Close remaining CORE-045 cumulative review blockers: narrow IPv4 special-use predicates to only non-global subranges while retaining public exceptions; match 3fff::/20 rather than 3fff::/16; propagate the actionable final claim error after stale recovery instead of the original EEXIST. Add deterministic regressions, refresh CORE-045 cumulative report/item traceability to head 0f9af92b and child lineage, and resolve the related PR #166 threads with evidence. Link [[CORE-045]].


## Closeout outcome

PR #173 (https://github.com/collisionengineers/kanmer/pull/173) merged 2026-08-22T12:51:54Z; child PR #174 (https://github.com/collisionengineers/kanmer/pull/174) merged 2026-08-22T12:48:12Z. Recorded merged-main proof on origin/main a8cc6b01; deterministic evidence and explicit INCONCLUSIVE boundaries are in proof.md.
