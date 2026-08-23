---
id: CORE-035
type: ticket
title: Spine integration verification
status: done
area: core
order: 70
assignee: core-035-executor
profile: chore
stageEntered:
  preparing: '2026-08-20T13:13:26.932Z'
  review: '2026-08-22T08:22:18.429Z'
  verifying: '2026-08-22T08:28:25.492Z'
  done: '2026-08-23T00:28:45.894Z'
labels:
  - integration
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-020-board-git-worktree-sync.md
  - docs/functional/frd/FRD-010-task-scoped-dispatch.md
  - docs/functional/frd/FRD-022-mcp-server-surface.md
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-006-typed-proof.md
prs:
  - >-
    https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/1
  - >-
    https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/2
archived: false
created: '2026-08-20T10:14:42.535Z'
updated: '2026-08-23T00:45:21.922Z'
---

## What
end-to-end on a disposable repo + board: packet fetched → refusal paths → take → implement → PR → `kanmer/gate` observations → protected merge → exact-SHA verify. Proof is the command log.

## Verification
- [x] Exact merged source verify passed.
- [x] Disposable fixture focused tests and local gate/refusal matrix recorded.
- [x] Hosted NO_TICKET, WRONG_STAGE, warning, and unreachable-commit evidence retained.
- [ ] Protected merge and detached exact-SHA verification: INCONCLUSIVE — GitHub refused private-repo branch protection with HTTP 403.

## Outcome
INCONCLUSIVE at the private GitHub branch-protection capability boundary. Disposable PRs remain open for independent review; no merge or bypass performed.
