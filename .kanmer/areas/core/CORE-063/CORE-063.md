---
id: CORE-063
type: ticket
title: Preserve the board root when ignore reconciliation fails
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T13:54:05.842Z'
  review: '2026-08-22T14:15:35.590Z'
  verifying: '2026-08-22T14:18:06.161Z'
  done: '2026-08-23T00:03:46.759Z'
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
  - 5f63636d64fa92b4dc682d910255e0552d4da35e
  - b1abac871da28522759d4e5582caa69d5cdb5cd5
prs:
  - '184'
archived: false
created: '2026-08-22T13:52:34.564Z'
updated: '2026-08-23T00:08:30.190Z'
---

Close CORE-058 review finding: if an attached board-worktree `.gitignore` cannot be reconciled (for example a Windows lock or permission failure), `ensureBoardWorktree` must return the known `boardRoot` with an actionable error/paused state instead of falling through to `empty()` and making callers fall back to the source checkout. Add a deterministic failure regression. Link [[CORE-058]].

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #184 merged at b1abac871da28522759d4e5582caa69d5cdb5cd5; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
