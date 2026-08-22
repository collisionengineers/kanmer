---
id: CORE-038
type: ticket
title: Make scripts rail Windows-safe
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - remediation
  - ci
  - windows
  - test-rail
groups:
  - HZN-007
  - HZN-004
links: []
blocks:
  - MCP-041
  - CORE-037
docs_todo: true
archived: false
created: '2026-08-22T01:09:51.313Z'
updated: '2026-08-22T01:10:38.824Z'
---

The required GitHub verify rail still exits red after CORE-037 and MCP-041 fixes. Reproduce and make the authoritative scripts test command enumerate tests portably without weakening coverage or adding an unapproved dependency. Preserve 80/80 script suite and prove shared verify rail.
