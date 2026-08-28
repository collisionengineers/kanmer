---
id: CORE-116
type: ticket
title: Add configurable Git delivery policy and delivery state
status: done
area: core
assignee: claude-code-core116
profile: feature
stageEntered:
  preparing: '2026-08-28T03:03:39.374Z'
  review: '2026-08-28T04:07:47.728Z'
  verifying: '2026-08-28T04:46:33.477Z'
  done: '2026-08-28T05:09:41.382Z'
taken_at: '2026-08-28T03:15:53.988Z'
branch: core-116-delivery-policy
worktree: .worktrees/core-116
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
  - CORE-119
  - CORE-132
refs:
  - docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
commits:
  - 3135cff9
  - 9e43296e
  - 5926adea745a73381dc8b1ee41521644c3b45ecd
  - 28a12643f1721cf7607ce5427f55fae281ba5026
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/299'
archived: false
created: '2026-08-26T21:02:41.969Z'
updated: '2026-08-28T05:12:21.071Z'
---

## What

Model per-project Git delivery policy, make execution material name its exact base SHA, base branch, PR target and verification target, and record delivery state on the ticket independently of the workflow stage.

**Rescoped 2026-08-28 during research.** FRD-031 spans two approved phases of the fixed product direction — Phase 5 (delivery policy and delivery state) and Phase 14 (release serialization). Release-channel leases, immutable candidate identity, supersession and `RELEASE_CHANNEL_HELD` moved to [[CORE-132]], which this ticket blocks. Reasoning and the alternatives considered are in `research/` F-01 and `open-questions/` Q1. FRD-031 itself is unchanged.

## Why

Main-only and dev-to-release projects need correct targets and merge SHAs without changing Kanmer's own repository policy merely for a demonstration, and an ordinary ticket must be able to reach Done on integration acceptance without waiting for a production release.

## Approach

- Declare integration branch, release branch, release-candidate pattern and hotfix-backport rule per project; absent block means Kanmer's current main-only policy.
- Carry the resolved base SHA, base branch, PR target and verification target on the execution packet, and make the merge gate notice a PR that targets the wrong branch.
- Record not-integrated / integrated branch+SHA / candidate / released branch+tag / deployed / production-verified on the ticket, non-gating, plus the backport a release-branch hotfix owes the integration branch.

## Verification

- [ ] A main-only fixture targets and verifies `main` at its exact merged SHA; a dev-to-main fixture targets `dev`, proves integration and records final release separately; a release-branch hotfix records its required integration backport; recorded release evidence never satisfies a stage gate.

## Outcome
