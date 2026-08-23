---
id: CORE-076
type: ticket
title: 'CORE-072 review: retry source cleanup after board commit'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T16:07:47.138Z'
  review: '2026-08-22T16:15:44.785Z'
  verifying: '2026-08-22T16:22:15.776Z'
  done: '2026-08-23T00:03:56.052Z'
taken_at: '2026-08-22T16:08:02.400Z'
branch: core-076-retry-orphan-cleanup
worktree: .worktrees/core-076
labels:
  - pr-review
  - core-072
  - automated-review
groups:
  - HZN-007
links:
  - CORE-072
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - ceaab8d455fd198a3421fa73bbf361ec33df0bd0
  - d4dee4bb668d27a1942532d940eb6d4508a224ab
prs:
  - '196'
archived: false
created: '2026-08-22T16:06:10.232Z'
updated: '2026-08-23T00:03:56.068Z'
---

PR #194 review finding: resumeOrphanMigration returns immediately when the board already has HEAD. If the first commit/push succeeded but source cleanup git rm failed, a later retry sees HEAD and never retries cleanup, leaving the source .kanmer tree as a stale second board. Make finalization idempotently retry cleanup after commit/push and add a deterministic post-commit cleanup failure regression.

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #196 merged at d4dee4bb668d27a1942532d940eb6d4508a224ab; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
