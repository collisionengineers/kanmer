---
id: CORE-105
type: ticket
title: Eliminate recurrent Windows area-validation test timeout
status: done
area: core
assignee: codex-core105
profile: fix
stageEntered:
  preparing: '2026-08-25T07:24:22.015Z'
  review: '2026-08-25T07:28:32.731Z'
  verifying: '2026-08-25T08:14:20.843Z'
  done: '2026-08-25T08:16:50.023Z'
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
commits:
  - 29e52eea693d597ac9189e77c21074ba8d244b14
prs:
  - '267'
archived: false
created: '2026-08-25T07:15:23.108Z'
updated: '2026-09-01T18:44:08.431Z'
---

CORE-104 raised the store area-validation test timeout to 15 seconds, but exact GUI-139 CI still produced a preserved 20.789-second timeout (309/310) between two green exact-head runs. Diagnose the actual slow path or set an evidence-based bounded timeout without changing assertions, then prove repeated hosted Windows runs.
