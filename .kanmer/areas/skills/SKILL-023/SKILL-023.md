---
id: SKILL-023
type: ticket
title: Conduct canon enters the AGENTS.md managed block
status: preparing
area: skills
assignee: ''
profile: feature
stageEntered:
  preparing: '2026-08-20T21:36:13.171Z'
labels: []
groups:
  - EPIC-012
  - HZN-006
links: []
blocks:
  - SKILL-026
docs_todo: true
archived: false
created: '2026-08-20T10:14:57.038Z'
updated: '2026-08-20T21:36:13.171Z'
---

## What
`scripts/agents-block-body.mjs` gains a compact "Agent conduct" section — the §4 canon, one line per rule; `verify-agents-block.mjs` e2e updated; `kanmer-setup` refresh distributes it; `get_status.repo` hash-staleness flags outdated blocks in every connected repo.

## Verification
- [ ] `npm run verify:agents-block` green
- [ ] a repo with the old block reports `behind`.

## Outcome
