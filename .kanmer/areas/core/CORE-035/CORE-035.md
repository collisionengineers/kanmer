---
id: CORE-035
type: ticket
title: Spine integration verification
status: implementing
area: core
order: 70
assignee: core-035-executor
profile: chore
stageEntered:
  preparing: '2026-08-20T13:13:26.932Z'
taken_at: '2026-08-22T07:55:47.652Z'
branch: core-035-spine-integration
worktree: .worktrees/core-035
labels:
  - integration
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/functional/frd/FRD-010-task-scoped-dispatch.md
  - docs/functional/frd/FRD-022-mcp-server-surface.md
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-006-typed-proof.md
archived: false
created: '2026-08-20T10:14:42.535Z'
updated: '2026-08-22T07:55:47.652Z'
---

## What
end-to-end on a disposable repo + board: packet fetched → refusal paths (spike, gated, taken) → take → implement → PR → `kanmer/gate` red on missing ticket / open questions → green → protected merge → exact-SHA verify → done. Proof is the command log.

## Verification
- [ ] every gate fires at least once in the log
- [ ] the happy path completes without manual overrides

## Outcome
