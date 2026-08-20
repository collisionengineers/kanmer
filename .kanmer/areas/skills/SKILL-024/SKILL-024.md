---
id: SKILL-024
type: ticket
title: kanmer-setup reconciles an AGENTS.md skeleton
status: done
area: skills
assignee: codex-mcp-client
profile: feature
stageEntered:
  preparing: '2026-08-20T22:14:21.141Z'
  review: '2026-08-20T22:20:22.397Z'
  verifying: '2026-08-20T22:22:57.730Z'
  done: '2026-08-20T22:24:30.408Z'
labels: []
groups:
  - EPIC-012
  - HZN-006
links: []
blocks:
  - SKILL-026
docs_todo: true
commits:
  - a725808
  - ccd1abd
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/79'
archived: false
created: '2026-08-20T10:14:57.049Z'
updated: '2026-08-20T22:25:25.702Z'
---

## What

setup ensures the target repo's AGENTS.md contains the required sections (§commands, §architecture map, §conventions, §gotchas, §verification) outside the managed block: absent file → create from template with TODO markers and file a docs ticket; present file → report missing sections only. Kanmer never rewrites human prose outside its block.

## Verification

- [ ] disposable-repo runs: no file / partial file / complete file each behave as specified
- [ ] idempotent.

## Outcome

Shipped via [PR #79](https://github.com/collisionengineers/kanmer/pull/79), merged 2026-08-20T22:22:51Z as `ccd1abd80b86fd3c04bdce12bd457484a7e61805`. The user-owned AGENTS.md skeleton contract is live; [[SKILL-026]] remains the follow-up integration verification.
