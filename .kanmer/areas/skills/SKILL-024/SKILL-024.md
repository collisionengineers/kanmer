---
id: SKILL-024
type: ticket
title: kanmer-setup reconciles an AGENTS.md skeleton
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
created: '2026-08-20T10:14:57.049Z'
updated: '2026-08-20T10:20:03.727Z'
---

## What
setup ensures the target repo's AGENTS.md contains the required sections (§commands, §architecture map, §conventions, §gotchas, §verification) outside the managed block: absent file → create from template with TODO markers and file a docs ticket; present file → report missing sections only. Kanmer never rewrites human prose outside its block.

## Verification
- [ ] disposable-repo runs: no file / partial file / complete file each behave as specified
- [ ] idempotent.

## Outcome
