---
id: CORE-119
type: ticket
title: >-
  Build golden-board evaluations and stable-to-candidate promotion rollback
  proof
status: implementing
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-09-02T00:47:16.030Z'
taken_at: '2026-09-03T23:56:32.479Z'
branch: CORE-119-golden-board-evaluations
worktree: .worktrees/core-119
claim_expires_at: '2026-09-04T06:05:46.852Z'
claim_controller: claude-code
lease_id: 3088fc60-11fb-4a10-8f47-52fea2d29ab6
lease_revision: 23
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-119'
lease_phase: implementing
lease_heartbeat_at: '2026-09-04T05:35:46.850Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
archived: false
created: '2026-08-26T21:02:42.079Z'
updated: '2026-09-04T05:35:46.850Z'
---

## What

Create disposable golden-board/provider evaluations and a stable-control-plane promotion procedure that proves candidate Kanmer can be upgraded and rolled back safely.

## Why

The new autonomy model must be demonstrated end to end while v0.3.12 remains the live board authority until promotion succeeds.

## Approach

- Cover the approved controller, lease, batch, capture, delivery, review, reconciliation, multi-project and release scenarios.
- Measure outcomes, corrections, churn and safety failures.
- Verify backup, promotion, CRUD/workflow acceptance and rollback against copied boards.

## Verification

- [ ] Required golden scenarios and a failed-promotion rollback complete with recorded evidence.

## Outcome
