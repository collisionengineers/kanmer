---
id: CORE-105
type: ticket
title: Eliminate recurrent Windows area-validation test timeout
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - test
  - windows
  - ci
  - flaky
links:
  - CORE-104
  - GUI-139
blocks:
  - CORE-103
archived: false
created: '2026-08-25T07:15:23.108Z'
updated: '2026-08-25T07:15:23.108Z'
---

CORE-104 raised the store area-validation test timeout to 15 seconds, but exact GUI-139 CI still produced a preserved 20.789-second timeout (309/310) between two green exact-head runs. Diagnose the actual slow path or set an evidence-based bounded timeout without changing assertions, then prove repeated hosted Windows runs.
