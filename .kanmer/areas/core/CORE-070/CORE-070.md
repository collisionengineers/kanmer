---
id: CORE-070
type: ticket
title: 'CORE-058 review: enforce effective cache ignore ordering'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:34:13.833Z'
  implementing: '2026-08-22T15:35:16.831Z'
  review: '2026-08-22T15:38:06.963Z'
  verifying: '2026-08-22T15:40:47.184Z'
  done: '2026-08-23T00:03:53.175Z'
taken_at: '2026-08-22T15:35:17.712Z'
branch: core-070-effective-cache-ignore
worktree: .worktrees/core-070
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
  - cc1cbf36
  - e966509c
prs:
  - '191'
archived: false
created: '2026-08-22T15:15:55.434Z'
updated: '2026-08-23T00:03:53.188Z'
---

PR #180 thread 3836307987: reconcile managed cache exclusions after later negations or verify effective ignore behavior, so an existing exception cannot make the sources cache trackable; add regression.

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #191 merged at e966509c729194916d24194a87257cc1d39f308b; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
