---
id: CORE-084
type: ticket
title: 'CORE-080 review: prove manual Retry production-caller safety'
status: verifying
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T18:08:47.960Z'
  review: '2026-08-22T18:19:35.396Z'
  verifying: '2026-08-22T18:24:44.174Z'
taken_at: '2026-08-22T18:09:43.468Z'
branch: core-084-retry-caller-regression
worktree: .worktrees/core-084
labels:
  - pr-review
  - branch-protection
  - board-sync
  - automated-review
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-080
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 7cca4bf9e799aa161b6e5da879e6ad942b13154c
  - e78323d7fb8ce695e40db80380d189e236726b25
prs:
  - '203'
archived: false
created: '2026-08-22T18:08:33.217Z'
updated: '2026-08-22T18:24:44.174Z'
---

Blocking remediation from the independent review of CORE-080 PR #201 at head 0e1be5f32efad1da57ee27bd2a2fe80033976bd1. The implementation preflights syncProject correctly, but the added tests exercise only preflightBoardSync directly. Add a production-caller regression proving a mismatched manual Retry does not invoke syncBoard or mutate refs, preserve the existing genuine-error and exact-destination assertions, and update the cumulative CORE-043 packet. This ticket is linked to and blocks [[CORE-080]].
