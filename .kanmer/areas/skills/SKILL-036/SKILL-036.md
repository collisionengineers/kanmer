---
id: SKILL-036
type: ticket
title: >-
  Implement durable /goal orchestration with bounded independent review and
  verification
status: backlog
area: skills
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
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
archived: false
created: '2026-08-26T21:02:42.025Z'
updated: '2026-08-26T21:41:04.909Z'
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
