---
id: CORE-111
type: ticket
title: Publish and validate v0.3.12 stabilization release
status: done
area: core
assignee: codex-release-controller
profile: chore
stageEntered:
  preparing: '2026-08-26T17:41:22.035Z'
  review: '2026-08-26T19:06:01.562Z'
  verifying: '2026-08-26T20:19:08.201Z'
  done: '2026-08-26T20:55:19.141Z'
labels:
  - release
  - v0.3.12
  - stabilization
links: []
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 0349f269a4f2e6c31cccd2d610c823f3718bfc77
  - 7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223
prs:
  - '281'
  - '282'
  - '283'
  - '284'
archived: false
created: '2026-08-26T17:40:55.916Z'
updated: '2026-08-26T20:56:53.095Z'
---

## Why

The public v0.3.11 control plane is functionally superseded for workflows corrected by PRs #281 and #282. A narrowly scoped patch release must stabilize the live controller before candidate architecture work begins.

## Outcome

Released [v0.3.12](https://github.com/collisionengineers/kanmer/releases/tag/v0.3.12) as the public latest release from `7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223` through [PR #283](https://github.com/collisionengineers/kanmer/pull/283) and [PR #284](https://github.com/collisionengineers/kanmer/pull/284). The release commit contains required [PR #281](https://github.com/collisionengineers/kanmer/pull/281) and [PR #282](https://github.com/collisionengineers/kanmer/pull/282) merges. The installed per-user control plane is pinned to the packaged v0.3.12 external runtime and serves the live GUI-142 board.

## Verification

- GitHub tag release verification run `33011927987` passed.
- Public MCPB, Windows installer, blockmap, and `latest.yml` passed independent byte-for-byte verification.
- The stable installed launcher probe and packaged MCP initialize, tools/list (37), and get_status passed against project fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`.
- See [proof](proof/proof.md) for exact merge/tag, commands, exit codes, and retained preflight history.
