---
id: CORE-062
type: ticket
title: Reconcile board-worktree ignores on local and remote branch attachment paths
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T13:53:22.742Z'
  review: '2026-08-22T14:04:59.392Z'
  verifying: '2026-08-22T14:07:26.918Z'
  done: '2026-08-23T00:03:45.770Z'
labels:
  - pr-review
  - board-sync
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - b167b667
  - a0acadee
prs:
  - '183'
archived: false
created: '2026-08-22T13:52:30.794Z'
updated: '2026-08-23T00:08:29.095Z'
---

Close CORE-058 review finding: `ensureBoardWorktree` creates the canonical worktree through `localExists` and `remoteExists` paths but only installs the board-worktree ignore rules for orphan creation. Move the shared reconciliation onto every successful creation path and add real-Git regressions proving `.kanmer/data/sources/` is present before sync for local and remote branch attachment. Link [[CORE-058]].

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #183 merged at a0acadee972d3359738d9cd4390098794f7d3b4d; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
