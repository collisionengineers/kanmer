---
id: SKILL-027
type: ticket
title: kanmer-groom gains a board-vs-reality sweep
status: done
area: skills
order: 1580
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-20T22:14:34.430Z'
  review: '2026-08-20T22:21:56.847Z'
  verifying: '2026-08-20T22:24:16.352Z'
  done: '2026-08-20T22:26:06.141Z'
labels: []
groups:
  - HZN-006
links: []
commits:
  - 1e5e761a4106d2e5e58f51d39ccdc098c9e2319d
prs:
  - '80'
archived: false
created: '2026-08-20T10:14:57.080Z'
updated: '2026-08-21T13:02:17.565Z'
---

## What
a groom step that checks open backlog/preparing tickets against `main`'s history for work that already shipped (search commits/PRs for the ticket id and its subject), proposing outcome-note + archive or rescope.

## Why
Kanmer's own board carried CORE-028 (shipped via PRs #57/#59, rail already on main) and GUI-076 (assets landed in `9ec7741`) as open backlog items; Pegasus diverged board-vs-reality catastrophically.

## Verification
- [ ] sweep on the current board flags the known cases and nothing else.

## Outcome
Merged through [PR #80](https://github.com/collisionengineers/kanmer/pull/80) on 2026-08-20 (`b5013fbfb7b45f21d0ac865ea7bec7d2bb12d12f`). The shipped `kanmer-groom` guidance now makes board-vs-reality findings evidence-first and advisory: whole delivery is proposed for Outcome/archive and partial delivery for rescope, never applied automatically. Verified on merged main; no follow-up tickets.
