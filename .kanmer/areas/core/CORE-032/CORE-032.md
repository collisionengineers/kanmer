---
id: CORE-032
type: ticket
title: GitHub Actions PR workflow — `verify` job only
status: implementing
area: core
order: 40
assignee: core032-executor
profile: chore
stageEntered:
  preparing: '2026-08-20T12:07:12.757Z'
taken_at: '2026-08-21T21:56:56.420Z'
branch: core-032-gha-verify
worktree: .worktrees/core-032
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-033
  - CORE-024
commits:
  - a24f924b512c22e14641d6a7c8102860862ae6a3
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/136'
archived: false
created: '2026-08-20T10:14:42.500Z'
updated: '2026-08-21T22:03:13.793Z'
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
