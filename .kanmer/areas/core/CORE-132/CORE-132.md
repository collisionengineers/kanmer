---
id: CORE-132
type: ticket
title: >-
  Serialize releases with release-channel leases and immutable candidate
  identity
status: review
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T06:59:47.277Z'
  review: '2026-08-28T07:47:14.196Z'
taken_at: '2026-08-28T07:10:58.408Z'
branch: core-132-release-channel-leases
worktree: .worktrees/core-132
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
commits:
  - e31f2fdc5f740d3c7dbad8fb5175bc9839f7b041
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/303'
archived: false
created: '2026-08-28T03:10:57.878Z'
updated: '2026-08-31T04:22:37.484Z'
---

## What

The second half of FRD-031: one renewable lease owns a release channel at a time, a release attempt is an immutable record with its own candidate identity, and reconciliation observes real release evidence instead of reporting `not-applicable`.

## Why

[[CORE-116]] delivers the delivery *policy* and per-ticket delivery *state*. Release serialization is a different persisted artefact, a different ownership model and a different failure surface. Splitting keeps each half one reviewable PR; the research and the seam are recorded in [[CORE-116]] `research/` and `open-questions/`.

The independent review of CORE-116 (PR #299, head `5926adea`, attestation version `ec30a08bcf3b2ecd`) confirmed the split is honest — it read FRD-031 directly and found every acceptance criterion covered by one half or the other, with none falling into the gap. It did correct one framing claim: `goal.md` does **not** pre-draw a clean seam, because Phase 5 rules 6-8 already name immutable candidates, remediation identity and one-lease-per-channel, which Phase 14 then specifies in depth. The split remains sound; only the "pre-existing seam" justification was overstated.

## Carried-in defect from CORE-116 (fix here — do not file separately)

**F-001, the most substantive finding of the CORE-116 review.** `dispatch_task`'s verification prompt reads `resolveDelivery(board).integrationBranch` instead of `deliveryTargets(...).verificationTarget`. For a hotfix these differ, so a verifier would be pointed at the wrong branch. It is dormant today only because no board declares a `delivery:` block, and it blocks no FRD-031 acceptance criterion — but it is a genuine correctness defect in shipped code, and this ticket already owns verification targets, so it is fixed here rather than becoming its own ticket.

`deliveryTargets` is otherwise confirmed to be the single definition of "hotfix" (a *recorded* `delivery_branch`, never a branch-name heuristic); do not introduce a second one.

## Approach

- Persist a release-channel lease reusing CORE-115's `withLeaseLock` critical section, renewable expiry and revision CAS — the mechanism, not the ticket-scoped record. Keep it out of `board.yml` and out of the item scan so v0.3.12 stays able to read the board.
- Persist a release attempt: channel, integration SHA, candidate identity, release branch/tag, included PRs and tickets, artifact manifest, verification state and successor. A changed candidate SHA mints a new candidate identity and may not reuse the old evidence.
- Refuse a second concurrent owner with `RELEASE_CHANNEL_HELD`; clear the lease on a successful or explicitly superseded terminal attempt while retaining a failed attempt's proof.
- Record a bounded retry schedule when the release service is unavailable, so independent work continues.
- Wire `ReconciliationEvidence.release.state` (`packages/core/src/types.ts:931-934`) — the consumer already exists at `packages/core/src/reconciliation.ts:58-71`; only the collector at `packages/mcp-server/src/reconciliation.ts:311-313` is stubbed.
- Route `dispatch_task`'s verification prompt through `deliveryTargets(...).verificationTarget` (F-001 above).

## Verification

- [ ] FRD-031 AC2 (immutable candidate half), AC3 (changed candidate SHA requires a new identity and new evidence), AC4 (`RELEASE_CHANNEL_HELD`; successful and superseded terminal attempts clear the lease appropriately) and the unavailable-release-service edge case all pass on fixtures.
- [ ] A hotfix ticket's `dispatch_task` verification prompt names the hotfix verification target, not the integration branch.

## Outcome
