---
id: CORE-039
type: ticket
title: Make release-notes script tests hermetic on clean CI
status: implementing
area: core
assignee: root
profile: fix
stageEntered:
  preparing: '2026-08-22T01:27:27.829Z'
taken_at: '2026-08-22T01:29:15.705Z'
branch: core-039-release-notes-hermetic
worktree: .worktrees/core-039
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
created: '2026-08-22T01:26:27.318Z'
updated: '2026-08-22T01:29:15.705Z'
---

The authoritative GitHub verify rail now reaches scripts/release-notes.test.mjs and fails in a clean checkout because release-notes.mjs cannot find .worktrees/kanmer. Make the test fixture or command independent of a local Kanmer board while preserving its PR-link assertion and 80-test coverage. Keep this separate from CORE-038 Windows glob enumeration and preserve exact CI evidence.
