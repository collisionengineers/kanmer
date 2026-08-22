---
id: CORE-090
type: ticket
title: 'CORE-026 review: refresh MCPB artifact after source-cache hardening'
status: preparing
area: core
assignee: ''
profile: fix
labels: []
groups:
  - HZN-007
links:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T22:26:12.855Z'
updated: '2026-08-22T22:26:12.855Z'
---

Refresh the committed MCPB/plugin artifact after CORE-088 source-cache hardening so the authoritative mcpb:check compares equal on the cumulative CORE-026 branch. Add the generated artifact only; no source behaviour change. This ticket blocks [[CORE-026]].
