---
id: CORE-066
type: ticket
title: 'CORE-058 review: preserve board root after first-time attachment failure'
status: preparing
area: core
assignee: ''
profile: fix
labels:
  - pr-review
  - board-sync
  - review-finding
groups:
  - HZN-007
links:
  - CORE-058
blocks:
  - CORE-058
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
docs_todo: true
archived: false
created: '2026-08-22T14:56:06.513Z'
updated: '2026-08-22T14:56:06.513Z'
---

Review finding from final PR #180 head b8d8a191161532e895fa399b6c95bf812dfdb2d0 (thread 3836285519). After local or remote worktree attachment, ensureBoardWorktreeIgnore(boardRoot) remains outside a guarded path; a deterministic .gitignore failure falls into the outer catch and returns empty() with boardRoot null. Preserve the known canonical root and paused/error state for first-time local/remote attachment just as for existing and renamed worktrees. Child of [[CORE-058]].
