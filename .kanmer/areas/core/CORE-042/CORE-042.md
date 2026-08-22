---
id: CORE-042
type: ticket
title: Adapt release workflow for protected main
status: review
area: core
assignee: core-042-take
profile: fix
stageEntered:
  preparing: '2026-08-22T07:33:39.438Z'
  review: '2026-08-22T07:48:14.801Z'
taken_at: '2026-08-22T07:37:15.962Z'
branch: core-042-protected-release
worktree: .worktrees/core-042
labels:
  - follow-up
  - release
  - branch-protection
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-033
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - aa6f9ddefe05aaa208fe2e00b06da019aaccb6d6
prs:
  - '160'
archived: false
created: '2026-08-22T06:48:09.492Z'
updated: '2026-08-22T07:48:14.801Z'
---

Deferred from CORE-033 review finding: scripts/release.mjs currently mutates and pushes main directly, which the new protected-main PR/verify boundary rejects. Design and implement the authorized release path so version bump/release commit reaches main through a compliant PR/check boundary while preserving tag publication and reachable release commits. No bypass push; retain dry-run and hosted release/update proof. Link [[CORE-033]].
