---
id: CORE-103
type: ticket
title: Publish and validate v0.3.8 closeout release
status: verifying
area: core
assignee: codex-closeout
profile: chore
stageEntered:
  preparing: '2026-08-25T01:10:15.001Z'
  implementing: '2026-08-25T01:10:19.884Z'
  review: '2026-08-25T09:02:34.978Z'
  verifying: '2026-08-25T09:13:42.067Z'
taken_at: '2026-08-25T08:17:47.041Z'
branch: release/v0.3.8
worktree: .worktrees/core-103
labels:
  - release
  - v0.3.8
  - closeout
groups:
  - HZN-007
links:
  - CORE-035
  - CORE-036
  - CORE-042
  - MCP-028
  - CORE-102
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 8c8fdb868aed3677b3603b9ba360f304139aee6f
prs:
  - '269'
archived: false
created: '2026-08-25T01:04:13.262Z'
updated: '2026-08-25T09:35:13.614Z'
---

## Purpose

Publish one final governed v0.3.8 release after DOC-025 merges, then provide the real positive release, updater, and installed-runtime evidence needed by the remaining active verification tickets.

## Acceptance criteria

- clean-clone preflight passes;
- release preparation change merges through protected main;
- the repository publisher creates immutable v0.3.8 tag and GitHub Release;
- tag workflow is terminal green;
- strict public asset verification passes;
- a v0.3.7 installation updates to v0.3.8;
- GUI and MCP runtime report v0.3.8 after restart;
- any failure is recorded on this ticket without retagging or opening an automatic successor.

## Constraints

- Do not alter v0.3.4–v0.3.7 tags, releases, or assets.
- Do not manually upload or repair assets.
- Do not weaken asset validation, CI, or branch protection.
- Do not start until [[DOC-025]] is merged and verified.
- No new source work unless a reproducible defect is discovered.
