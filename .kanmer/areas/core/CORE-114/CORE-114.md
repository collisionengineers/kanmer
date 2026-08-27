---
id: CORE-114
type: ticket
title: Add logical project identity and revision-safe mutation contracts
status: review
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T17:31:37.028Z'
  review: '2026-08-27T18:13:31.044Z'
  implementing: '2026-08-27T18:44:42.353Z'
taken_at: '2026-08-27T17:38:47.769Z'
branch: core-114-project-identity
worktree: .worktrees/core-114
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
refs:
  - docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md
commits:
  - e2bb6ed895a9e3074a3d9521113ac64d153cbecc
  - 631e3a0eef68da61c7d55c1d9948d6583db6f470
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/291'
archived: false
created: '2026-08-26T21:02:41.938Z'
updated: '2026-08-27T18:58:25.408Z'
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
