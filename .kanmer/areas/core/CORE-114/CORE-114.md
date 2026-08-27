---
id: CORE-114
type: ticket
title: Add logical project identity and revision-safe mutation contracts
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T17:31:37.028Z'
  review: '2026-08-27T18:13:31.044Z'
  implementing: '2026-08-27T18:44:42.353Z'
  verifying: '2026-08-27T19:04:49.086Z'
  done: '2026-08-27T19:17:57.015Z'
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
  - 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/291'
archived: false
created: '2026-08-26T21:02:41.938Z'
updated: '2026-08-27T19:19:40.262Z'
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

- [x] Same board at different paths retains identity; wrong endpoint and stale revision writes are refused.

## Outcome

- Merged: PR #291 https://github.com/collisionengineers/kanmer/pull/291 (squash merge 97dfc9f3b446819ed626b4f94008aae6d7a7d0f5, 2026-08-27T19:04:35Z); branch commits e2bb6ed8, 631e3a0e.
- Review delta attestation fdc1c78976f228d7; proof a12d28c8dc906d78 PASS at the merge SHA.
- Shipped as planned: project.json identity, location fingerprint, WRONG_PROJECT / REVISION_CONFLICT, expected_revision on all mutating tools, migrate_board identity allocation.
- Follow-up noted, not created: F-008 — a literal NUL byte in packages/core/src/project.ts should be replaced with an escape.
- Operational note: the live board remains legacy/unassigned (no project.json) until an operator runs migrate_board; the installed v0.3.12 server stays compatible either way.
