---
id: CORE-038
type: ticket
title: Make scripts rail Windows-safe
status: done
area: core
assignee: core-038-take
profile: fix
stageEntered:
  preparing: '2026-08-22T01:11:36.912Z'
  review: '2026-08-22T01:22:20.095Z'
  verifying: '2026-08-22T02:00:10.309Z'
  done: '2026-08-22T02:02:43.658Z'
taken_at: '2026-08-22T01:14:43.606Z'
branch: core-038-scripts-windows-safe
worktree: .worktrees/core-038
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
commits:
  - 7919f5eb267a6347ccc7b267ffecb90db38c90e3
  - 5bd2e4bfbc8d71ef3793a7b97100baae25092eee
prs:
  - '145'
  - '146'
archived: false
created: '2026-08-22T01:09:51.313Z'
updated: '2026-08-22T02:02:43.658Z'
---

The required GitHub verify rail still exits red after CORE-037 and MCP-041 fixes. Reproduce and make the authoritative scripts test command enumerate tests portably without weakening coverage or adding an unapproved dependency. Preserve 80/80 script suite and prove shared verify rail.
