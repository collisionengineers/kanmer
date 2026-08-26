---
id: CORE-111
type: ticket
title: Publish and validate v0.3.12 stabilization release
status: review
area: core
assignee: codex-release-controller
profile: chore
stageEntered:
  preparing: '2026-08-26T17:41:22.035Z'
  review: '2026-08-26T19:06:01.562Z'
  verifying: '2026-08-26T20:19:08.201Z'
taken_at: '2026-08-26T19:04:43.490Z'
branch: core-111-release-v0-3-12
worktree: .worktrees/core-111
labels:
  - release
  - v0.3.12
  - stabilization
links: []
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 0349f269a4f2e6c31cccd2d610c823f3718bfc77
prs:
  - '283'
  - '284'
archived: false
created: '2026-08-26T17:40:55.916Z'
updated: '2026-08-26T20:31:33.282Z'
---

## Why

The public v0.3.11 control plane is functionally superseded for workflows corrected by PRs #281 and #282. A narrowly scoped patch release must stabilize the live controller before candidate architecture work begins.

## Outcome


## Verification

Release v0.3.12 contains merged PRs #281 and #282 plus strictly necessary release metadata; the complete verification rail, plugin/MCP synchronization, Windows installer, updater manifest/blockmap, asset size and SHA-256 validation, release workflow, and supported installed launcher/connect smoke all pass. The packaged v0.3.12 server is installed/pinned as the live board authority.
