---
id: SKILL-036
type: ticket
title: >-
  Implement durable /goal orchestration with bounded independent review and
  verification
status: review
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T05:20:16.077Z'
  review: '2026-08-28T05:39:17.064Z'
taken_at: '2026-08-28T05:26:30.075Z'
branch: skill-036-durable-goal-orchestration
worktree: .worktrees/skill-036
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-119
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - aa5f73daa03d94c609ce8d45646ab52fd0f54b0b
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/302'
archived: false
created: '2026-08-26T21:02:42.025Z'
updated: '2026-08-28T05:39:17.064Z'
---

## What

Add a durable controller that freezes a selected roster, reconciles live state, dispatches bounded work, obtains independent exact-head review, routes finite remediation, merges and verifies exact merged SHAs.

## Why

The approved operating model requires autonomous progress without self-review, stale worker prose or infinite review cycles.

## Approach

- Persist run identity, authority, roster, lanes, retry budget and reconciliation decisions.
- Integrate leases, step packets, review attestations and verification routing.
- Enforce the stated review budget and preserve minor-risk dispositions without reopening unchanged findings.

## Verification

- [ ] A prepared fixture board clears through a fresh reviewer and verifier; exceeded budget performs one controlled replan or records a terminal disposition.

## Outcome
