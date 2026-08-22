---
id: CORE-032
type: ticket
title: GitHub Actions PR workflow — `verify` job only
status: done
area: core
order: 40
assignee: core032-executor
profile: chore
stageEntered:
  preparing: '2026-08-20T12:07:12.757Z'
  review: '2026-08-21T22:06:15.840Z'
  verifying: '2026-08-21T22:08:41.524Z'
  done: '2026-08-22T03:04:03.944Z'
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
  - 2ba84147cc513ad23e2811e09c005772cb259cfb
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/136'
archived: false
created: '2026-08-20T10:14:42.500Z'
updated: '2026-08-22T03:05:02.772Z'
---

## What
.github/workflows/pr.yml with exactly one job verify: windows-latest, Node 20, npm ci && npm run verify, defaults.run.shell: bash, permissions: contents: read, and pull_request triggers opened|synchronize|reopened|ready_for_review for main only.

## Why
first CI in the repo; main is unprotected and PR #64 showed statusCheckRollup: [].

## Approach
no kanmer-gate stub (never offer protection a check that has not appeared). kanmer-board pushes must not trigger it. Do not switch to ubuntu — Windows-specific tests are the product. Target < 10 min.

## Verification
- [x] job green on a real PR — final Windows verify passed in PR #142 run 32546955237 / job 96967001211 after CORE-037 fixed the earlier runneradmin versus RUNNER~1 path-alias failure.
- [ ] board sync commits trigger nothing — no authorized post-merge board-sync run was manufactured; this remains INCONCLUSIVE.

## Outcome
PR #136 (https://github.com/collisionengineers/kanmer/pull/136) merged at 2026-08-21T22:08:21Z as 2ba84147cc513ad23e2811e09c005772cb259cfb. The one-file workflow is present on merged main and the later green Windows verify run proves the shipped check contract. CORE-037 owns and fixed the path-alias failure exposed by the original run. CORE-024 and CORE-033 remain separate workflow/protection tickets. A merged-main local verify attempt retained two unrelated MCP HTTP/tunnel timing failures; no CORE-032 assertion or workflow step was weakened.
