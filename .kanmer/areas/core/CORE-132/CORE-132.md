---
id: CORE-132
type: ticket
title: >-
  Serialize releases with release-channel leases and immutable candidate
  identity
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
  - CORE-119
refs:
  - docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
archived: false
created: '2026-08-28T03:10:57.878Z'
updated: '2026-08-28T04:26:33.193Z'
---

## What

The second half of FRD-031: one renewable lease owns a release channel at a time, a release attempt is an immutable record with its own candidate identity, and reconciliation observes real release evidence instead of reporting `not-applicable`.

## Why

[[CORE-116]] delivers the delivery *policy* and per-ticket delivery *state* (goal.md Phase 5). Release serialization is goal.md Phase 14 — a different persisted artefact, a different ownership model and a different failure surface. Splitting keeps each half one reviewable PR; the research and the seam are recorded in [[CORE-116]] `research/` and `open-questions/`.

## Approach

- Persist a release-channel lease reusing CORE-115's `withLeaseLock` critical section, renewable expiry and revision CAS — the mechanism, not the ticket-scoped record. Keep it out of `board.yml` and out of the item scan so v0.3.12 stays able to read the board.
- Persist a release attempt: channel, integration SHA, candidate identity, release branch/tag, included PRs and tickets, artifact manifest, verification state and successor. A changed candidate SHA mints a new candidate identity and may not reuse the old evidence.
- Refuse a second concurrent owner with `RELEASE_CHANNEL_HELD`; clear the lease on a successful or explicitly superseded terminal attempt while retaining a failed attempt's proof.
- Record a bounded retry schedule when the release service is unavailable, so independent work continues.
- Wire `ReconciliationEvidence.release.state` (`packages/core/src/types.ts:931-934`) — the consumer already exists at `packages/core/src/reconciliation.ts:58-71`; only the collector at `packages/mcp-server/src/reconciliation.ts:311-313` is stubbed.

## Verification

- [ ] FRD-031 AC2 (immutable candidate half), AC3 (changed candidate SHA requires a new identity and new evidence), AC4 (`RELEASE_CHANNEL_HELD`; successful and superseded terminal attempts clear the lease appropriately) and the unavailable-release-service edge case all pass on fixtures.

## Outcome
