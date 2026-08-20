---
id: CORE-032
type: ticket
title: GitHub Actions PR workflow — `verify` job only
status: preparing
area: core
assignee: ''
profile: chore
stageEntered:
  preparing: '2026-08-20T12:07:12.757Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
blocks:
  - CORE-033
  - CORE-024
archived: false
created: '2026-08-20T10:14:42.500Z'
updated: '2026-08-20T12:07:12.757Z'
---

## What
`.github/workflows/pr.yml` with exactly one job `verify`: `windows-latest`, Node 20, `npm ci && npm run verify`, `defaults.run.shell: bash`, `permissions: contents: read`, triggers `opened|synchronize|reopened|ready_for_review` on PRs to `main` only.

## Why
first CI in the repo; `main` is unprotected and PR #64 shows `statusCheckRollup: []`.

## Approach
no `kanmer-gate` stub (never offer protection a check that hasn't appeared). `kanmer-board` pushes must not trigger it. Do not switch to ubuntu — Windows-specific tests are the product. Target < 10 min.

## Verification
- [ ] job green on a real PR
- [ ] board sync commits trigger nothing

## Outcome
