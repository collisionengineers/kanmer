---
id: SKILL-026
type: ticket
title: AGENTS.md ownership integration verification
status: preparing
area: skills
assignee: ''
profile: chore
stageEntered:
  preparing: '2026-08-21T01:12:09.070Z'
labels:
  - integration
groups:
  - EPIC-012
  - HZN-006
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md
archived: false
created: '2026-08-20T10:14:57.069Z'
updated: '2026-08-21T01:13:32.437Z'
---

## What
on a disposable repo: kanmer-setup produces block + canon + skeleton; tampering with the block flags `behind`; re-run is a no-op; removing Kanmer removes the block and leaves human prose intact.

## Verification
- [ ] command log as proof.

## Outcome
