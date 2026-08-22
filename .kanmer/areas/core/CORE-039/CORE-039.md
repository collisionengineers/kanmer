---
id: CORE-039
type: ticket
title: Make release-notes script tests hermetic on clean CI
status: verifying
area: core
assignee: root
profile: fix
stageEntered:
  preparing: '2026-08-22T01:27:27.829Z'
  review: '2026-08-22T01:35:10.441Z'
  verifying: '2026-08-22T02:00:10.468Z'
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
commits:
  - 79c85e07c977f29270ca84f62b1c729b28fe1d57
  - 3ceaa056f9927778d6e3183a78e78914bbede5bb
prs:
  - '145'
  - '147'
archived: false
created: '2026-08-22T01:26:27.318Z'
updated: '2026-08-22T02:00:10.468Z'
---

The authoritative GitHub verify rail now reaches scripts/release-notes.test.mjs and fails in a clean checkout because release-notes.mjs cannot find .worktrees/kanmer. Make the test fixture or command independent of a local Kanmer board while preserving its PR-link assertion and 80-test coverage. Keep this separate from CORE-038 Windows glob enumeration and preserve exact CI evidence.
