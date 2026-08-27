---
id: CORE-113
type: ticket
title: Add dry-run-first rescue and reconciliation for delivery state
status: review
area: core
assignee: codex-goal-controller
profile: feature
stageEntered:
  preparing: '2026-08-26T21:45:23.896Z'
  review: '2026-08-26T22:15:29.820Z'
  implementing: '2026-08-26T22:36:35.233Z'
taken_at: '2026-08-26T21:48:26.729Z'
branch: core-113-rescue-reconciliation
worktree: .worktrees/core-113
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-114
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - 61927fffeced9f216d5849667357e63964345f2d
  - 83279d14638e874bd98ccf764ccd7844897c6993
  - db63fb4b150e956dafb88c75c99ff3088a0b72cc
prs:
  - '286'
archived: false
created: '2026-08-26T21:02:41.922Z'
updated: '2026-08-26T23:11:36.002Z'
---

## What

Provide a small, dependency-light reconciliation surface that inspects ticket, claim, workspace, Git, PR, check, merge, proof and release state, then proposes or explicitly applies safe recovery.

## Why

A partially broken phase workflow must not make the board unrecoverable or leave merged and verified tickets in invalid stages.

## Approach

- Support dry-run and explicit apply with an auditable proposed action.
- Cover invalid Review/Verifying states, abandoned claims, stale completed workspaces, and superseded or conflicting release attempts.
- Never delete dirty work or touch the board worktree.

## Verification

- [x] Fixture boards demonstrate each required invalid-state route and a dry-run never mutates state.

## Outcome

Implemented in `61927fffeced9f216d5849667357e63964345f2d`, remediated in `83279d14638e874bd98ccf764ccd7844897c6993`, and hardened by the one authorised final remediation commit `db63fb4b150e956dafb88c75c99ff3088a0b72cc`. The candidate adds read-only `reconcile_ticket` plus expected-project-guarded `apply_reconciliation`, with authenticated proof/check/PR/commit/workspace evidence and explicit no-apply classification for unsafe or inconclusive states. The full verification rail passed at the final candidate, but the fresh independent review identified terminal major F-015 / GH-3867261017; CORE-113 remains in Review pending an operator decision, with no additional automatic remediation or merge.
