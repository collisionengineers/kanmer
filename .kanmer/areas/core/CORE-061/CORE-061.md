---
id: CORE-061
type: ticket
title: >-
  CORE-043 review remediation: record KANMER_BOARD_BRANCH convention in
  AGENTS.md
status: verifying
area: core
assignee: codex-core061-take
profile: fix
stageEntered:
  preparing: '2026-08-22T13:33:16.784Z'
  review: '2026-08-22T13:44:17.937Z'
  verifying: '2026-08-22T13:48:08.004Z'
taken_at: '2026-08-22T13:37:08.613Z'
branch: core-061-agents-branch-convention
worktree: .worktrees/core-061
labels:
  - pr-review
  - branch-protection
  - docs
groups:
  - HZN-007
links:
  - CORE-043
blocks: []
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 216dcdf0
prs:
  - '181'
archived: false
created: '2026-08-22T13:28:04.880Z'
updated: '2026-08-22T17:21:03.997Z'
---

Close the current CORE-043 review finding required by repository operating rules: update the governing AGENTS.md convention for KANMER_BOARD_BRANCH and the administrator handoff in the same scoped change, preserving the managed block contract and generated/manual synchronization. Add exact docs/managed-block evidence. Link [[CORE-043]].
