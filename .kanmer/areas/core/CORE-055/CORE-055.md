---
id: CORE-055
type: ticket
title: 'CORE-054 review remediation: skip all rename paths on branch mismatch'
status: implementing
area: core
assignee: codex-mcp-client
profile: fix
taken_at: '2026-08-22T13:02:47.057Z'
branch: core-055-skip-mismatch-rename
worktree: .worktrees/core-055
labels:
  - pr-review
  - branch-protection
  - board-sync
groups:
  - HZN-007
links:
  - CORE-054
blocks:
  - CORE-054
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T13:01:26.151Z'
updated: '2026-08-22T13:02:47.057Z'
---

Close the remaining CORE-054 review finding: when `refreshBoardBranch` reports `branchMismatch`, `applyGitPreferences` must skip both the protected refusal rename and the ordinary rename loop. Preserve the current preference and live refs/worktree state for stale cached branches or failed prior handoffs. Add an integration regression exercising the mismatch with a cached branch different from the saved preference. Link [[CORE-054]].
