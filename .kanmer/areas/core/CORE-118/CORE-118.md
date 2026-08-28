---
id: CORE-118
type: ticket
title: Compile evidence-backed constrained plans into step packets
status: done
area: core
assignee: claude-code-core118
profile: feature
stageEntered:
  preparing: '2026-08-27T23:05:50.724Z'
  review: '2026-08-27T23:43:41.998Z'
  verifying: '2026-08-28T00:01:23.407Z'
  done: '2026-08-28T00:47:10.322Z'
taken_at: '2026-08-27T23:13:55.287Z'
branch: core-118-step-packets
worktree: .worktrees/core-118
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
  - CORE-127
refs:
  - docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md
commits:
  - 924d7294c128f66c72dd1d8da6f01337cef9ab4b
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/297'
archived: false
created: '2026-08-26T21:02:42.005Z'
updated: '2026-08-28T00:47:10.322Z'
---

## What

Strengthen preparation evidence and canonical plans, then compile approved plans into bounded step packets a constrained worker can execute safely.

## Why

A weak worker needs exact permitted files, symbols, behaviour, tests and stop conditions rather than an unbounded repository prompt.

## Approach

- Separate shared group research from ticket impact research.
- Validate concrete plan fields and risk-sensitive evidence.
- Compile versioned packets and reconcile actual changes after every step.

## Verification

- [ ] Validation rejects unresolved vague plan language and a fixture worker packet enforces allowed files and completion evidence.

## Outcome
