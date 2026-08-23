---
id: CORE-091
type: ticket
title: Refresh committed MCP artifact after current main source merge
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - remediation
  - artifact
  - mcpb
groups:
  - HZN-007
links:
  - CORE-090
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-23T00:53:27.109Z'
updated: '2026-08-23T00:53:27.109Z'
---

The current merged main source builds a standalone MCP server whose bytes differ from plugins/kanmer/mcp/kanmer-mcp.cjs, so npm run verify stops at mcpb:check. Refresh the committed artifact from a normal checkout at the exact current source, preserve byte-parity assertions, run plugin:check and mcpb:check in a clean checkout, obtain independent review, merge, and verify the exact merged artifact on main. No source behavior or assertion weakening is in scope.
