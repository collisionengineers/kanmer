---
id: CORE-094
type: ticket
title: Restore core exports required by the MCP standalone build
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - build
  - mcp-server
  - regression
groups:
  - HZN-007
links:
  - CORE-044
  - MCP-048
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-24T14:30:14.921Z'
updated: '2026-08-24T14:30:14.921Z'
---

## What

Current `origin/main` cannot complete `npm run build`: the MCP standalone bundle imports declared-source and delivery symbols from `@kanmer/core` that are absent from the core public export. This was reproduced in an isolated clean current-main checkout after `npm ci --ignore-scripts`.

## Scope

Restore the intended public core exports or align the MCP imports so the normal core → MCP server build is internally consistent. Do not fold in tunnel-readiness timing changes from [[MCP-048]]. Preserve the declared-source contract from [[CORE-044]].

## Verification

- [ ] A clean current-main-derived checkout completes `npm run build` with exit 0.
- [ ] The standalone MCP bundle launches and exposes its declared tool surface.
- [ ] Focused core/MCP source-contract coverage passes without weakening assertions.

## Outcome
