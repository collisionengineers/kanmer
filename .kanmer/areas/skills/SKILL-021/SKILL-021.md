---
id: SKILL-021
type: ticket
title: >-
  kanmer-execute/review/verify bind to the packet, SHA records, and exact-SHA
  verification
status: preparing
area: skills
order: 170
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-20T12:43:43.531Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
links: []
blocks:
  - CORE-035
archived: false
created: '2026-08-20T10:14:57.015Z'
updated: '2026-08-20T13:46:18.983Z'
---

## What
execute — first data call is `get_execution_packet`; if `ready:false`, stop; sniff `get_status.compat.expectedProject` before ever sending the token; never merge; worktree `.worktrees/<id>` only; stop at the brief's stop condition. review — write `scratch/review.md` by whole-file replace with `head_sha` from `gh pr view --json headRefOid`; pull GitHub review threads into the disposition; once required checks exist, do not merge while they are red. verify — `git fetch origin && git worktree add --detach .worktrees/verify-<id>-<merged_sha> <merged_sha>` (from `gh pr view --json mergeCommit`); never update `main` in any checkout as a side effect; write proof frontmatter by replace; if the PR is unmerged this skill is running too early — stop.

## Why
today review self-documents merging outside the engine, and verify tests "whatever main is now".

## Verification
- [ ] `verify:skills` green
- [ ] a full ticket walked end-to-end uses the new paths.

## Outcome
