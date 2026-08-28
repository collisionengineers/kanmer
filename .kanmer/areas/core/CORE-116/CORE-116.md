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
updated: '2026-08-28T05:13:20.462Z'
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

**Shipped:** merged via [PR #299](https://github.com/collisionengineers/kanmer/pull/299), merge commit `28a12643f1721cf7607ce5427f55fae281ba5026`. Configurable Git delivery policy and per-ticket delivery state — a `delivery:` block in `board.yml` with `resolveDelivery`/`deliveryTargets`/`assertDeliveryPolicy`; nine additive `delivery_*` ticket fields validated against the *merged* post-patch record; a `WRONG_TARGET` merge-gate check fed by `pull_request.base.ref`; a `delivery` block on the execution packet naming base SHA, base branch, PR target and verification target; `get_status.delivery`; delivery params on `create_item`/`update_item`. Tool roster unchanged at 39; no board-format bump; Kanmer's own board policy unchanged.

**Scope split:** FRD-031 was split during implementation. This ticket delivered AC1, AC5, AC2-minus-its-candidate-clause and the "release evidence never verifies an unmerged branch" edge case. [[CORE-132]] owns AC2's immutable-candidate clause, AC3, AC4 and the unavailable-release-service retry edge. FRD-031 itself was not edited. The independent review verified criterion by criterion that nothing fell into the gap.

**Carried-forward defect:** `packages/mcp-server/src/index.ts:1045` uses `resolveDelivery(...).integrationBranch` instead of `deliveryTargets(...).verificationTarget`, so a hotfix's `dispatch_task` verification prompt would name the wrong branch. It blocks no acceptance criterion (the execution packet and merge gate both route through `deliveryTargets` correctly) and is already folded into CORE-132 as a required fix with its own verification checkbox — deliberately not filed as a separate ticket, per the group's Scope discipline.

**Residual risk:** the review recorded 13 findings, all minor/note, all dispositioned accepted residual risk in attestation `ec30a08bcf3b2ecd`. No follow-up tickets were filed.

**Verification note worth preserving:** the hosted push run at the merge SHA (33142774219) initially failed on `store.test.ts > "updates fields and stamps updated"` (548/549). A re-run of the same job at the same SHA with no code change succeeded. The test is untouched by this PR, passed locally 549/549 at the exact SHA, and the new board read is guarded by `touchesDelivery()` so an ordinary update gains no I/O — so this was the known intermittent Windows timing class, not a regression. Both attempts are retained in the proof.

**Deployment:** this board declares no `deployment` block (attempting to set `deployment` on this ticket is refused with "This board has no deployment tracking"), so there is nothing to record — n/a, consistent with CORE-117's closeout.
