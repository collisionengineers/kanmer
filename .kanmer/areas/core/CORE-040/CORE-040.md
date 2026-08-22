---
id: CORE-040
type: ticket
title: Make release-notes regression independent of missing tags
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - remediation
  - ci
  - hermetic
  - test-rail
groups:
  - HZN-007
  - HZN-004
links: []
blocks:
  - MCP-041
docs_todo: true
archived: false
created: '2026-08-22T01:38:51.132Z'
updated: '2026-08-22T01:39:00.339Z'
---

The authoritative PR #145 verify rail now reaches scripts/release-notes.test.mjs after CORE-039 but fails in a clean shallow CI checkout because tag v0.3.2 is unavailable. Make the regression use a deterministic date cutoff or isolated git fixture while preserving the documented CORE-027/PR #96 canonical-link assertion and 80/80 coverage. Keep separate from CORE-039 board fixture work and preserve exact hosted evidence.
