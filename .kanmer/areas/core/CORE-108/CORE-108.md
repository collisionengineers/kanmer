---
id: CORE-108
type: ticket
title: Verify draft releases through a draft-capable GitHub identity
status: review
area: core
assignee: codex
profile: fix
stageEntered:
  implementing: '2026-08-25T11:53:35.738Z'
  review: '2026-08-25T11:56:02.967Z'
taken_at: '2026-08-25T11:52:37.877Z'
branch: core-108-draft-release-lookup
worktree: .worktrees/core-108
labels:
  - release
  - github
  - regression
links:
  - CORE-106
  - CORE-107
blocks:
  - CORE-107
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - b253d27611051b54e04994490a9d702d758567f8
  - 28ecbe2a
prs:
  - '273'
archived: false
created: '2026-08-25T11:52:01.670Z'
updated: '2026-08-25T11:59:27.420Z'
---

The governed v0.3.9 publisher creates a draft and uploads all assets, then calls the tag-specific GitHub Releases REST endpoint. GitHub returns 404 for that unpublished draft even with the same authenticated credential that can list and inspect it, so strict verification cannot complete and the release remains unpublished. Fix draft identity/lookup without weakening asset/digest checks, add regression coverage using the actual draft shape, and publish only a higher successor release. Links [[CORE-106]] and blocks [[CORE-107]].
