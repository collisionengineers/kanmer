---
id: CORE-110
type: ticket
title: Publish and validate v0.3.11 connector closeout release
status: review
area: core
assignee: codex
profile: chore
stageEntered:
  preparing: '2026-08-25T16:05:24.094Z'
  review: '2026-08-25T16:07:35.198Z'
  verifying: '2026-08-25T16:26:39.941Z'
taken_at: '2026-08-25T16:35:08.076Z'
branch: release/v0.3.11
worktree: .worktrees/release-prep-0.3.11
labels:
  - release
  - v0.3.11
  - closeout
links: []
refs:
  - docs/functional/frd/FRD-025-remote-access.md
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 48d819d6d896f3bf4aac66925a2a92cbc6baa202
  - 887c3830ff853b7333c40a1e33bd41a7e83ea3a9
prs:
  - '279'
  - '280'
archived: false
created: '2026-08-25T16:05:04.081Z'
updated: '2026-08-25T16:35:08.076Z'
---

Publish and independently validate the consolidated Windows release containing the merged remote ChatGPT connector and setup fixes. This ticket changes no product scope: it packages the already-merged main branch, verifies the public updater artifacts, and hands GUI installation to the user.
