---
id: CORE-116
type: ticket
title: >-
  Add configurable Git delivery policy, delivery state and release-channel
  leases
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
  - CORE-119
refs:
  - docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
archived: false
created: '2026-08-26T21:02:41.969Z'
updated: '2026-08-26T21:41:04.875Z'
---

## What

Model per-project integration/release policy, separate workflow completion from delivery state, and serialize releases with one active channel lease.

## Why

Main-only and dev-to-release projects need correct targets and immutable candidate evidence without changing Kanmer's own policy merely for a demonstration.

## Approach

- Configure integration branch, release branch, candidate pattern and hotfix backport.
- Record integration, candidate, release and deployment state independently of stages.
- Route superseded release attempts to immutable history and prevent channel contention.

## Verification

- [ ] Main-only and dev-to-frozen-candidate-to-main scenarios prove correct targets, merge SHAs and serialization.

## Outcome
