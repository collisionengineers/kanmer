---
id: CORE-117
type: ticket
title: Add quick capture mode and deliberate promotion workflow
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
refs:
  - docs/functional/frd/FRD-032-quick-capture-and-promotion.md
archived: false
created: '2026-08-26T21:02:41.985Z'
updated: '2026-08-26T21:41:04.886Z'
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
