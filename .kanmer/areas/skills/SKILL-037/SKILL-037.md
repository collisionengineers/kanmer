---
id: SKILL-037
type: ticket
title: >-
  Review consolidation and remediation-loop contract (expected reviewers settle,
  delta review, same-PR return, failure class)
status: review
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T16:39:10.836Z'
  review: '2026-08-27T16:50:23.509Z'
taken_at: '2026-08-27T16:44:20.605Z'
branch: skill-037-review-remediation-contract
worktree: .worktrees/skill-037
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - e6c9e0ad2cbb3f55ea287bcb25026096f2fe2f20
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/290'
archived: false
created: '2026-08-27T10:07:40.838Z'
updated: '2026-08-27T16:50:23.509Z'
---

## What

Rewrite the review/execute/verify/auto skill contracts so a final attestation cannot precede later automated-review findings, an in-scope finding returns the same ticket/branch/worktree/PR to implementation legally, and verification failures carry a typed class.

## Why

CORE-113's attestation at `db63fb4b` was written from a thread snapshot gathered before Codex round 3 posted and omitted four current P1s. kanmer-review says "leave the ticket in Review" on needs-changes, kanmer-execute always creates a new PR, kanmer-verify has no implementation-vs-plan distinction, and the remediation budget lived only in plan prose.

## Approach

- `plugins/kanmer/skills/kanmer-review/SKILL.md`: `expected_reviewers` set and settle rule (every expected reviewer has posted on the exact head, or explicit timeout-absent); attestation gains `board_sha` and `threads_snapshot`; mandatory GH-id → F-id mapping; delta-review scope; `review_round`/`remediation_budget` handling; sanctioned needs-changes return (uses the bootstrap ownership contract).
- `kanmer-execute/SKILL.md`: re-entry lane — existing PR, same worktree/branch, push only.
- `kanmer-verify/SKILL.md`: proof gains `failure_class: implementation | plan | transient | inconclusive`; routing table (implementation → Implementing, plan → Preparing, transient → retry in Verifying).
- `kanmer-auto/SKILL.md`: transfer an expired claim instead of stopping; never force.
- Regenerate plugin bundle; update AGENTS.md managed block.

## Verification

- [ ] `npm run verify:skills` passes; agents-block check passes.
- [ ] Golden scenario: push head, reviewer waits for expected reviewers, attestation lists all their threads; a later thread on the same head makes the attestation non-authoritative.
- [ ] Golden scenario: needs-changes → same PR remediation → delta review → merge, with `review_round` = 1.

## Outcome
