---
id: SKILL-026
type: ticket
title: AGENTS.md ownership integration verification
status: done
area: skills
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-21T01:12:09.070Z'
  review: '2026-08-21T01:18:32.515Z'
  verifying: '2026-08-21T01:19:18.042Z'
  done: '2026-08-21T01:19:49.973Z'
taken_at: '2026-08-21T01:14:41.602Z'
branch: skill-026-agents-ownership-integration
worktree: .worktrees/skill-026
labels:
  - integration
groups:
  - EPIC-012
  - HZN-006
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md
commits:
  - f9afee5
prs:
  - '99'
archived: false
created: '2026-08-20T10:14:57.069Z'
updated: '2026-08-21T01:19:49.973Z'
---

## What
on a disposable repo: kanmer-setup produces block + canon + skeleton; tampering with the block flags `behind`; re-run is a no-op; removing Kanmer removes the block and leaves human prose intact.

## Verification
- [ ] command log as proof.

## Outcome
