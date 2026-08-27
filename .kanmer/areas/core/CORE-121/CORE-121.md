---
id: CORE-121
type: ticket
title: >-
  Bootstrap ownership and backward-move contract (expiring claims, transfer,
  audited Review → Implementing)
status: review
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T10:11:31.642Z'
  review: '2026-08-27T11:00:54.345Z'
taken_at: '2026-08-27T10:15:27.555Z'
branch: core-121-bootstrap-ownership
worktree: .worktrees/core-121
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-122
  - CORE-123
  - SKILL-037
  - CORE-114
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - a79f125c95cad5e1d93ac393a84bb89a7ac5ccc3
prs:
  - '287'
archived: false
created: '2026-08-27T10:07:40.746Z'
updated: '2026-08-27T11:00:54.345Z'
---

## What

Add the smallest v0.3.12-compatible ownership contract that lets a stuck ticket be recovered without `force`: claim fields `controller_run`, `expires_at`, `claim_revision`, `review_round`, `remediation_budget` (all optional; absent = legacy), a `take_ticket action: "transfer"` that succeeds only for an expired claim or an operator-authorised handoff and preserves branch/worktree, a `renew` action, and an owner-or-operator, reason-bearing, audited backward move where Review → Implementing requires a `needs-changes` attestation bound to the current PR head.

## Why

CORE-113 deadlocked because a permanent claim by a dead controller could not be transferred, `get_execution_packet` refuses non-implementing stages and foreign owners, and no actor is sanctioned to move Review → Implementing (`gates.ts` allows any backward move with zero evidence). Every later HZN-008 lane needs a legal path back to the same PR.

## Approach

- `packages/core/src/types.ts`: optional claim/budget fields; `packages/core/src/store.ts`: `takeTicket` transfer/renew with `CLAIM_LIVE` refusal, `assertMoveAllowed` backward-move rule (reason + owner/operator + `expected_updated`; Review→Implementing needs a current `needs-changes` attestation or operator reason; increments `review_round`).
- `packages/mcp-server/src/execution-packet.ts`: issue a packet on the same worktree when stage is implementing and `review_round > 0`; refuse an expired-claim owner without transfer.
- MCP `take_ticket` / `move_item` schemas; durable audit rows (`claim-transfer`, `review-return`) plus a `## Transitions` append in `scratch/execution.md`.
- No lease heartbeat/batch mode (CORE-115), no revision protocol (CORE-114). Ship on the stable line as a patch release.

## Verification

- [ ] Transfer of a live claim is refused with `CLAIM_LIVE`; transfer of an expired claim preserves branch and worktree and records old/new controller.
- [ ] Backward move without reason is refused; Review → Implementing with a current `needs-changes` attestation succeeds and increments `review_round`.
- [ ] `get_execution_packet` issues a resumed packet after a needs-changes return on the same worktree.
- [ ] A v0.3.12 board with none of the new fields reads and behaves unchanged.

## Outcome
