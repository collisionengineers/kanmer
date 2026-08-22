---
id: CORE-041
type: ticket
title: Make project identity smoke drive-neutral on Windows CI
status: review
area: core
assignee: /root/core041_executor
profile: fix
stageEntered:
  preparing: '2026-08-22T01:49:38.777Z'
  review: '2026-08-22T01:53:57.107Z'
taken_at: '2026-08-22T01:51:05.369Z'
branch: core-041-project-identity-drive-neutral
worktree: .worktrees/core-041
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
docs_todo: true
commits:
  - 88ec6307
prs:
  - '149'
archived: false
created: '2026-08-22T01:47:24.828Z'
updated: '2026-08-22T01:53:57.107Z'
---

The final stacked PR #145 verify rail reaches smoke.mjs and fails on hosted Windows because project identity smoke expectations hardcode c:/ for POSIX-style roots while the runner checkout is on D:. Make the smoke expectation derive the platform drive without weakening canonical path or fingerprint assertions. Keep this separate from CORE-040 release-notes cutoff and preserve exact hosted evidence.
