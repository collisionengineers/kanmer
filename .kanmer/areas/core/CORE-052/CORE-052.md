---
id: CORE-052
type: ticket
title: >-
  CORE-043 review remediation: preserve branch handoff state and regenerate
  manual guidance
status: implementing
area: core
assignee: codex-core052-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T12:34:05.081Z'
  implementing: '2026-08-22T12:34:44.202Z'
taken_at: '2026-08-22T12:34:49.490Z'
branch: core-052-board-refresh-state
worktree: .worktrees/core-052
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
commits:
  - 825fb79d
prs:
  - '175'
archived: false
created: '2026-08-22T12:33:30.281Z'
updated: '2026-08-22T12:46:20.352Z'
---

Close remaining CORE-043 cumulative review findings: document the KANMER_BOARD_BRANCH Actions-variable handoff; refresh and require equality with the requested destination; preserve paused/error state during branch refresh; fix contradictory troubleshooting.md rename guidance and regenerate the manual. Link [[CORE-043]].
