---
id: SKILL-023
type: ticket
title: Conduct canon enters the AGENTS.md managed block
status: backlog
area: skills
assignee: ''
profile: feature
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
updated: '2026-08-20T10:20:02.830Z'
---

## What
`scripts/agents-block-body.mjs` gains a compact "Agent conduct" section — the §4 canon, one line per rule; `verify-agents-block.mjs` e2e updated; `kanmer-setup` refresh distributes it; `get_status.repo` hash-staleness flags outdated blocks in every connected repo.

## Verification
- [ ] `npm run verify:agents-block` green
- [ ] a repo with the old block reports `behind`.

## Outcome
