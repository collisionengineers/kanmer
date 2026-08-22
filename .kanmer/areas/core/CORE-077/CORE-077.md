---
id: CORE-077
type: ticket
title: 'CORE-060 review: validate live board branch before automatic sync'
status: implementing
area: core
assignee: codex-core077-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T16:45:13.278Z'
  implementing: '2026-08-22T16:45:35.866Z'
taken_at: '2026-08-22T16:45:36.930Z'
branch: core-077-live-board-branch
worktree: .worktrees/core-077
labels:
  - pr-review
  - core-060
  - automated-review
links:
  - CORE-060
blocks:
  - CORE-060
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
archived: false
created: '2026-08-22T16:44:50.734Z'
updated: '2026-08-22T16:45:36.930Z'
---

PR #197 review finding: automatic sync trusts cached branch state. Before syncing, inspect the live board worktree branch and refuse or pause when it differs from the saved handoff branch; add a deterministic regression.
