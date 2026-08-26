---
id: CORE-115
type: ticket
title: Replace permanent claims with renewable workspace leases and batch ownership
status: backlog
area: core
assignee: ''
profile: feature
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
archived: false
created: '2026-08-26T21:02:41.955Z'
updated: '2026-08-26T21:41:04.863Z'
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
