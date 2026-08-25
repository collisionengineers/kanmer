---
id: CORE-109
type: ticket
title: Publish and validate v0.3.10 recovery release
status: backlog
area: core
assignee: ''
profile: chore
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
archived: false
created: '2026-08-25T12:43:12.101Z'
updated: '2026-08-25T12:43:12.101Z'
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
