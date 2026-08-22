---
id: CORE-080
type: ticket
title: >-
  CORE-043 review remediation: recheck live branch on manual retry and align
  retained-ref contract
status: review
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T17:50:45.742Z'
  review: '2026-08-22T18:02:12.922Z'
taken_at: '2026-08-22T17:53:55.230Z'
branch: core-080-manual-retry-preflight
worktree: .worktrees/core-080
labels:
  - pr-review
  - branch-protection
  - board-sync
  - automated-review
groups:
  - HZN-007
  - EPIC-009
links:
  - CORE-043
blocks:
  - CORE-043
refs:
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
commits:
  - 0e1be5f32efad1da57ee27bd2a2fe80033976bd1
prs:
  - '201'
archived: false
created: '2026-08-22T17:50:29.988Z'
updated: '2026-08-22T18:02:12.922Z'
---

## What
Close the latest independent review findings on [[CORE-043]]: manual Retry must inspect the live board worktree before syncing, and the approved FRD/manual contract must explicitly describe retained old refs until the hosted board-branch variable is updated.

## Why
A paused handoff can currently be retried against the cached branch, and the shipped requirement still describes deleting the old custom ref even though the safe implementation retains it for operator handoff.

## Approach
- Reuse the live branch inspection and mismatch state already introduced by CORE-043.
- Guard the manual Retry path before any commit, rebase, or push.
- Align FRD-020 and user-facing guidance with the retained-ref handoff.
- Add focused regression coverage and preserve protected-default refusal.

## Verification
- [ ] Focused GUI Git tests cover manual Retry after a live branch handoff and retained-ref messaging.
- [ ] Full GUI/core/script rails pass on the implementation branch.
- [ ] Independent review and merged-main proof complete.

## Outcome
