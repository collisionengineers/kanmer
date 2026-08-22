---
id: CORE-059
type: ticket
title: >-
  CORE-043 review remediation: keep Actions board branch variable aligned on
  custom rename
status: implementing
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T13:31:18.460Z'
taken_at: '2026-08-22T13:36:49.750Z'
branch: core-059-gate-ref-retention
worktree: .worktrees/core-059
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - HZN-007
links:
  - CORE-043
blocks:
  - CORE-043
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T13:28:04.825Z'
updated: '2026-08-22T13:36:49.750Z'
---

Close the current CORE-043 review finding: once KANMER_BOARD_BRANCH is introduced as the hosted gate source, every supported custom-to-custom board rename must preserve or explicitly coordinate that variable before deleting the previous remote ref. Keep the handoff fail-closed and add deterministic workflow/manual/rename regression evidence. Link [[CORE-043]].
