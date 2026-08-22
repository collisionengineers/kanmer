---
id: CORE-040
type: ticket
title: Make release-notes regression independent of missing tags
status: verifying
area: core
assignee: root
profile: fix
stageEntered:
  review: '2026-08-22T01:42:11.313Z'
  verifying: '2026-08-22T02:00:10.615Z'
taken_at: '2026-08-22T01:40:08.155Z'
branch: core-040-release-notes-tag-hermetic
worktree: .worktrees/core-040
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
  - 6f17bccfec7577c4a2645fa1abe2d5251aacb8c4
  - ad8be25b4f105a80548d9232021d812b2853efb8
prs:
  - '145'
  - '148'
archived: false
created: '2026-08-22T01:38:51.132Z'
updated: '2026-08-22T02:00:10.615Z'
---

The authoritative PR #145 verify rail now reaches scripts/release-notes.test.mjs after CORE-039 but fails in a clean shallow CI checkout because tag v0.3.2 is unavailable. Make the regression use a deterministic date cutoff or isolated git fixture while preserving the documented CORE-027/PR #96 canonical-link assertion and 80/80 coverage. Keep separate from CORE-039 board fixture work and preserve exact hosted evidence.
