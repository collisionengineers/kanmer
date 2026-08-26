---
id: CORE-113
type: ticket
title: Add dry-run-first rescue and reconciliation for delivery state
status: backlog
area: core
assignee: ''
profile: feature
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-114
docs_todo: true
archived: false
created: '2026-08-26T21:02:41.922Z'
updated: '2026-08-26T21:03:16.958Z'
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

- [ ] Fixture boards demonstrate each required invalid-state route and a dry-run never mutates state.

## Outcome
