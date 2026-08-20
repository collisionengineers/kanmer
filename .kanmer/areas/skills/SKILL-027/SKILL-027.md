---
id: SKILL-027
type: ticket
title: kanmer-groom gains a board-vs-reality sweep
status: implementing
area: skills
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-20T22:14:34.430Z'
taken_at: '2026-08-20T22:18:48.519Z'
branch: skill-027-board-reality-sweep
worktree: .worktrees/skill-027
labels: []
groups:
  - HZN-006
links: []
archived: false
created: '2026-08-20T10:14:57.080Z'
updated: '2026-08-20T22:18:48.519Z'
---

## What
a groom step that checks open backlog/preparing tickets against `main`'s history for work that already shipped (search commits/PRs for the ticket id and its subject), proposing outcome-note + archive or rescope.

## Why
Kanmer's own board carried CORE-028 (shipped via PRs #57/#59, rail already on main) and GUI-076 (assets landed in `9ec7741`) as open backlog items; Pegasus diverged board-vs-reality catastrophically.

## Verification
- [ ] sweep on the current board flags the known cases and nothing else.

## Outcome
