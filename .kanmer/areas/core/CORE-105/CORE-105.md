---
id: CORE-105
type: ticket
title: Eliminate recurrent Windows area-validation test timeout
status: review
area: core
assignee: codex-core105
profile: fix
stageEntered:
  preparing: '2026-08-25T07:24:22.015Z'
  review: '2026-08-25T07:28:32.731Z'
taken_at: '2026-08-25T07:24:22.075Z'
branch: core-105-area-validation-timeout
worktree: .worktrees/core-105
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
  - c9a54b60
prs:
  - '267'
archived: false
created: '2026-08-25T07:15:23.108Z'
updated: '2026-08-25T07:28:32.731Z'
---

CORE-104 raised the store area-validation test timeout to 15 seconds, but exact GUI-139 CI still produced a preserved 20.789-second timeout (309/310) between two green exact-head runs. Diagnose the actual slow path or set an evidence-based bounded timeout without changing assertions, then prove repeated hosted Windows runs.
