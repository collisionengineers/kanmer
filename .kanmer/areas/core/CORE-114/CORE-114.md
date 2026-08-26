---
id: CORE-114
type: ticket
title: Add logical project identity and revision-safe mutation contracts
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
  - CORE-115
  - CORE-116
  - CORE-117
  - CORE-118
  - MCP-054
docs_todo: true
archived: false
created: '2026-08-26T21:02:41.938Z'
updated: '2026-08-26T21:03:16.980Z'
---

## What

Separate stable logical project/board identity from a machine-local location fingerprint, and require compare-and-swap revisions for mutations.

## Why

Independent controllers on different paths or machines need one project identity while wrong-project and concurrent writes fail structurally.

## Approach

- Persist project/board UUIDs and expose project, controller, worker, workspace and location identifiers.
- Return stable WRONG_PROJECT and REVISION_CONFLICT responses.
- Keep one project per MCP process; requests never select an arbitrary path.

## Verification

- [ ] Same board at different paths retains identity; wrong endpoint and stale revision writes are refused.

## Outcome
