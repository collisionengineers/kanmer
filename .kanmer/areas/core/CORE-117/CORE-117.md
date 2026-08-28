---
id: CORE-117
type: ticket
title: Add quick capture mode and deliberate promotion workflow
status: review
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T00:53:14.228Z'
  review: '2026-08-28T02:20:16.444Z'
taken_at: '2026-08-28T01:01:58.152Z'
branch: core-117-quick-capture
worktree: .worktrees/core-117
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
refs:
  - docs/functional/frd/FRD-032-quick-capture-and-promotion.md
commits:
  - cbd05ca5dd925989c5d556aa00b2b60a0e2b0a98
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/298'
archived: false
created: '2026-08-26T21:02:41.985Z'
updated: '2026-08-28T02:20:16.444Z'
---

## What

Add a lightweight capture item that is visible and searchable without delivery-document debt, plus explicit promotion or archival outcomes.

## Why

Observations must be recordable quickly without entering unattended goal selection as malformed implementation tickets.

## Approach

- Require only concise observation metadata and optional evidence.
- Exclude captures from /goal and readiness metrics.
- Support duplicate, fixed, batch, normal-ticket, retained-capture and archive promotion outcomes.

## Verification

- [ ] A capture stays out of goal selection, then promotion records one deliberate disposition.

## Outcome
