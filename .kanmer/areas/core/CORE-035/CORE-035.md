---
id: CORE-035
type: ticket
title: Spine integration verification
status: preparing
area: core
order: 70
assignee: ''
profile: chore
stageEntered:
  preparing: '2026-08-20T13:13:26.932Z'
labels:
  - integration
groups:
  - EPIC-009
  - HZN-004
links: []
archived: false
created: '2026-08-20T10:14:42.535Z'
updated: '2026-08-20T13:46:18.926Z'
---

## What
end-to-end on a disposable repo + board: packet fetched → refusal paths (spike, gated, taken) → take → implement → PR → `kanmer/gate` red on missing ticket / open questions → green → protected merge → exact-SHA verify → done. Proof is the command log.

## Verification
- [ ] every gate fires at least once in the log
- [ ] the happy path completes without manual overrides

## Outcome
