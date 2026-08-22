---
id: CORE-084
type: ticket
title: 'CORE-080 review: prove manual Retry production-caller safety'
status: implementing
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T18:08:47.960Z'
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
blocks:
  - CORE-080
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T18:08:33.217Z'
updated: '2026-08-22T18:09:43.468Z'
---

Blocking remediation from the independent review of CORE-080 PR #201 at head 0e1be5f32efad1da57ee27bd2a2fe80033976bd1. The implementation preflights syncProject correctly, but the added tests exercise only preflightBoardSync directly. Add a production-caller regression proving a mismatched manual Retry does not invoke syncBoard or mutate refs, preserve the existing genuine-error and exact-destination assertions, and update the cumulative CORE-043 packet. This ticket is linked to and blocks [[CORE-080]].
