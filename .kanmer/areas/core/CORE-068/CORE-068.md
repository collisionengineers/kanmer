---
id: CORE-068
type: ticket
title: 'CORE-058 review: re-arm automatic sync after ignore-repair retry'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T15:18:23.125Z'
  review: '2026-08-22T15:27:25.220Z'
  verifying: '2026-08-22T15:29:20.714Z'
  done: '2026-08-23T00:03:52.078Z'
labels:
  - pr-review
  - core-058
  - automated-review
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - c90d056d
  - 14c2d0fd
prs:
  - '189'
archived: false
created: '2026-08-22T15:15:55.378Z'
updated: '2026-08-23T00:08:36.190Z'
---

PR #180 thread 3836307985: when retry repairs a temporarily unavailable board worktree, restore the automatic sync timer for the already-enabled interval; add a deterministic regression and preserve the paused/retry state semantics.

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #189 merged at 14c2d0fd743a62cf20a2c24946954275ceda5c8b; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
