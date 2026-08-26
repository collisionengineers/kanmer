---
id: CORE-118
type: ticket
title: Compile evidence-backed constrained plans into step packets
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
  - docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md
archived: false
created: '2026-08-26T21:02:42.005Z'
updated: '2026-08-26T21:41:04.898Z'
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
