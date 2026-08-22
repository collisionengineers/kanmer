---
id: CORE-066
type: ticket
title: 'CORE-058 review: preserve board root after first-time attachment failure'
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  implementing: '2026-08-22T14:58:05.666Z'
  review: '2026-08-22T15:03:31.449Z'
  verifying: '2026-08-22T15:04:43.929Z'
taken_at: '2026-08-22T14:58:06.486Z'
branch: core-066-first-attachment-root
worktree: .worktrees/core-066
labels:
  - pr-review
  - board-sync
  - review-finding
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 134cf0b76cc26ac001df78658ccb2545c1ba9ddb
  - d3eb3728d6dca7cdeebd72c251f8ee3e1c47934f
prs:
  - '187'
archived: false
created: '2026-08-22T14:56:06.513Z'
updated: '2026-08-22T15:04:43.929Z'
---

Review finding from final PR #180 head b8d8a191161532e895fa399b6c95bf812dfdb2d0 (thread 3836285519). After local or remote worktree attachment, ensureBoardWorktreeIgnore(boardRoot) remains outside a guarded path; a deterministic .gitignore failure falls into the outer catch and returns empty() with boardRoot null. Preserve the known canonical root and paused/error state for first-time local/remote attachment just as for existing and renamed worktrees. Child of [[CORE-058]].
