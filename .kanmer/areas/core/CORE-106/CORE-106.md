---
id: CORE-106
type: ticket
title: Make release publication single-build and externally verifiable
status: review
area: core
assignee: codex-core106
profile: fix
stageEntered:
  preparing: '2026-08-25T09:39:23.470Z'
  review: '2026-08-25T10:13:09.817Z'
taken_at: '2026-08-25T09:41:54.552Z'
branch: core-106-single-build-release
worktree: .worktrees/core-106
labels:
  - release
  - remediation
  - updater
groups:
  - HZN-007
links:
  - CORE-103
  - CORE-036
  - CORE-042
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 3ceafecd24c768d169b2a5cfaf803783f09eed13
  - 9def9c09c4e3b8c04d2880094782533fe48b82cc
  - ff0f6033e1db279fd95356f64e5f09ee9e6b2cb6
  - 05083f4075d0588ceec633725e40774d0badd5a5
  - 5b3b61af85359c3a4f2c9d708856d1b3d1920964
prs:
  - '270'
archived: false
created: '2026-08-25T09:39:07.478Z'
updated: '2026-08-25T10:37:33.622Z'
---

v0.3.8 exposed two release-system defects: electron-builder raced an already-created GitHub release and left only the installer uploaded, while the tag workflow independently rebuilt a signed NSIS installer and required byte identity with the publisher build. Signed installers are not reproducible across builds, so that verifier can fail even when both builds are valid. Establish one authoritative package generation and one publication owner, preserve strict manifest/hash checks against that generation, recover incomplete-release handling without retagging, and add regression tests for the exact failure.
