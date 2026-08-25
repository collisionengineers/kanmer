---
id: CORE-109
type: ticket
title: Publish and validate v0.3.10 recovery release
status: review
area: core
assignee: codex
profile: chore
stageEntered:
  preparing: '2026-08-25T12:44:51.759Z'
  review: '2026-08-25T12:55:23.671Z'
taken_at: '2026-08-25T12:44:58.374Z'
branch: core-109-release-v0-3-10
worktree: .worktrees/core-109
labels:
  - release
  - v0.3.10
  - closeout
links:
  - CORE-107
  - CORE-036
  - CORE-042
  - MCP-028
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - a309d4e7c89b1956d7c4c76697ab7f05a0d31736
  - 7b518d0c303a56c18e6310f1818d2e7e9c3cf3e2
prs:
  - '275'
  - '276'
archived: false
created: '2026-08-25T12:43:12.101Z'
updated: '2026-08-25T13:06:16.147Z'
---

## Purpose

Publish and validate the first clean successor after the immutable failed v0.3.8 and unpublished v0.3.9 attempts, including the merged draft-verification fix and terminal-verification lifecycle correction.

## Acceptance criteria

- current protected `main` passes the complete clean-clone verification rail;
- one authoritative Windows package generation produces the complete canonical asset set;
- the governed publisher creates and validates a draft by numeric release identity, then publishes v0.3.10 exactly once;
- the immutable v0.3.10 tag workflow is terminal green and strict public asset verification exits 0;
- an installed older Kanmer updates or reinstalls coherently to v0.3.10 without a split executable/resources version;
- the restarted GUI and packaged MCP runtime both report v0.3.10;
- Codex Connect and its pasteable launcher probe work through the installed boundary;
- Cloudflare remote access at `mcp.rivetandrelay.co.uk` and the OpenAI managed tunnel runtime pass their provider-specific health and authenticated MCP checks;
- failed v0.3.8 and v0.3.9 attempts remain preserved as archived non-success records.

## Constraints

- Do not retag, republish, repair, or manually upload assets to v0.3.8 or v0.3.9.
- Do not weaken verification, branch protection, updater checks, or asset integrity rules.
- Keep Cloudflare and OpenAI tunnel implementations distinct.
- Store credentials only through the already-authorized Infisical/process environment path and never in source or ticket evidence.

Supersedes [[CORE-107]] and provides positive deployment evidence for [[CORE-036]], [[CORE-042]], and [[MCP-028]].
