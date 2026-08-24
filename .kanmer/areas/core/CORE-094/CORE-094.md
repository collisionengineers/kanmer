---
id: CORE-094
type: ticket
title: Invalid observation — contaminated current-main build check
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
archived: true
created: '2026-08-24T14:30:14.921Z'
updated: '2026-08-24T14:31:27.432Z'
---

## Disposition

Archived without implementation. The earlier build failure was not a current-main defect: the linked worktree sat below the original checkout, so `npm` resolved the parent checkout's older `@kanmer/core` build. Current main exports the named source-contract symbols through `packages/core/src/index.ts`.

No source change, PR, or remediation is required from this invalid observation. [[MCP-048]] remains independently scoped to loopback readiness timing.
