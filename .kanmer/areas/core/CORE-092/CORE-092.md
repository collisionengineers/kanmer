---
id: CORE-092
type: ticket
title: Fetch board branch into a resolvable CI ref
status: verifying
area: core
assignee: codex
profile: fix
stageEntered:
  preparing: '2026-08-24T09:38:03.826Z'
  review: '2026-08-24T09:44:37.030Z'
  verifying: '2026-08-24T10:57:09.210Z'
taken_at: '2026-08-24T09:39:50.163Z'
branch: core-092-board-branch-fetch-ref
worktree: .worktrees/core-092
labels:
  - ci
  - merge-gate
  - remediation
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links:
  - CORE-024
blocks: []
refs:
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - 883db4ea136e43762fe93b3f08c48660a634725b
  - 6f9fd5dc926b92981fcad87b1b8e026f0329854e
prs:
  - '233'
archived: false
created: '2026-08-24T09:36:52.291Z'
updated: '2026-08-24T10:57:09.210Z'
---

## What

Fix the `kanmer-gate` workflow so the fetched board branch is available as the revision passed to `git worktree add` on GitHub Actions.

## Why

`git fetch origin <branch>` updates `FETCH_HEAD` but is not guaranteed to create `origin/<branch>` in a shallow pull-request checkout. The current workflow then resolves a missing ref before the read-only merge-gate CLI can run.

## Verification

- [ ] The workflow fetch command explicitly maps the configured board branch to a remote-tracking ref.
- [ ] The worktree command uses that exact ref, with the existing separate-board safety check retained.
- [ ] Focused workflow/static checks and the merge-gate CLI tests pass.

## Scope

This is a remediation for [[CORE-024]]. The phase-2 CLI already exists on current `origin/main`; no new gate semantics are introduced.
