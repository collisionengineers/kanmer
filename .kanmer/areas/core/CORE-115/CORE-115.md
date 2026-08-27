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
  - 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/293'
archived: false
created: '2026-08-26T21:02:41.955Z'
updated: '2026-08-27T20:46:35.467Z'
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

- [x] Contention, expiry recovery, dirty work preservation and three-ticket batch fixtures pass.

## Outcome

- Merged PR #293 (https://github.com/collisionengineers/kanmer/pull/293) as 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc on 2026-08-27; delta review attestation 901b175b698baf3a; proof f66edd8a39e77464 PASS.
- Shipped differently than planned: batch mode (frozen bounded batch membership / shared evidence) was split out to CORE-124; lease lock coverage follow-up tracked as CORE-125.
- Deferred: F-013 (skills don't heartbeat) to SKILL-036.
- Closeout: worktree `.worktrees/core-115` and branch `core-115-workspace-leases` removed locally and on origin; claim released.
