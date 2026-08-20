---
id: SKILL-025
type: ticket
title: 'Work-type brief templates: fix, UI/UX, docs, cloud/infra, data/migration'
status: done
area: skills
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T21:56:24.499Z'
  review: '2026-08-20T22:02:20.141Z'
  verifying: '2026-08-20T22:08:21.602Z'
  done: '2026-08-20T22:08:39.090Z'
taken_at: '2026-08-20T21:58:35.496Z'
branch: skill-025-work-type-brief-templates
worktree: .worktrees/skill-025
labels: []
groups:
  - EPIC-012
  - HZN-006
links: []
commits:
  - b6b03a3c76ba7d3851cfaa7259915daaf73e6404
prs:
  - '78'
archived: false
created: '2026-08-20T10:14:57.059Z'
updated: '2026-08-20T22:08:39.090Z'
---

## What
five optional overlay templates as kanmer-plan assets the planner copies into a brief when the work matches: **fix** (reproduction, root cause, regression boundary, negative test); **UI/UX** (loading/empty/error/disabled/success states, keyboard + accessibility, responsive constraints, visual proof, no unrelated redesign); **docs** (audience, source of truth, claims changed, examples executed, version sensitivity); **cloud/infra** (tenant/subscription/environment, least-privilege identity, IaC diff, plan/dry-run output, cost impact, rollback, no secrets); **data/migration** (up + down, backfill, runtime-role permission test, grants ride the diff, rollback/data-loss analysis).

## Why
domain coverage via templates, never engines — each line maps to an observed Pegasus failure or a standing risk.

## Verification
- [ ] assets exist
- [ ] kanmer-plan names when to reach for them.

## Outcome
