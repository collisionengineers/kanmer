---
id: CORE-115
type: ticket
title: Replace permanent claims with renewable workspace leases and batch ownership
status: done
area: core
assignee: claude-code-core115
profile: feature
stageEntered:
  preparing: '2026-08-27T19:19:33.844Z'
  review: '2026-08-27T20:00:21.860Z'
  implementing: '2026-08-27T20:07:02.152Z'
  verifying: '2026-08-27T20:29:10.748Z'
  done: '2026-08-27T20:44:57.841Z'
taken_at: '2026-08-27T19:25:56.817Z'
branch: core-115-workspace-leases
worktree: .worktrees/core-115
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
  - CORE-124
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
commits:
  - 20c2fb31
  - 431006da
  - c76c2927
  - 08586176
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/293'
archived: false
created: '2026-08-26T21:02:41.955Z'
updated: '2026-08-27T20:44:57.841Z'
---

## What

Introduce revision-safe renewable leases and make one active writer per workspace the ownership invariant, with isolated and explicit batch modes.

## Why

Dead agents must be recoverable without allowing a live controller or batch workspace to be silently taken over.

## Approach

- Record controller/worker/workspace identity, heartbeat, expiry, phase and revision on leases.
- Safely reconcile expired leases without deleting dirty work.
- Support frozen bounded batch membership and shared PR/review/verification evidence.

## Verification

- [ ] Contention, expiry recovery, dirty work preservation and three-ticket batch fixtures pass.

## Outcome
