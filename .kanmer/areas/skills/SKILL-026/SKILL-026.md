---
id: SKILL-026
type: ticket
title: AGENTS.md ownership integration verification
status: done
area: skills
order: 1570
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-21T01:12:09.070Z'
  review: '2026-08-21T01:18:32.515Z'
  verifying: '2026-08-21T01:19:18.042Z'
  done: '2026-08-21T01:19:49.973Z'
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
  - a34f087
prs:
  - '99'
archived: false
created: '2026-08-20T10:14:57.069Z'
updated: '2026-08-21T13:02:17.556Z'
---

## What
on a disposable repo: kanmer-setup produces block + canon + skeleton; tampering with the block flags `behind`; re-run is a no-op; removing Kanmer removes the block and leaves human prose intact.

## Verification
- [x] Command-log proof recorded in `proof.md` after merged-main verification.

## Outcome
Shipped via [PR #99](https://github.com/collisionengineers/kanmer/pull/99), merged 2026-08-21T01:19:13Z as `a34f087d9d8d0d33a78fda1238cbf53f3f907d7d`. The canonical AGENTS skeleton no longer contains a literal managed-marker sentinel that blocks fresh setup, and one disposable integration test protects setup, content-hash drift detection, idempotence, and safe removal.
