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
  - >-
    https://github.com/collisionengineers/kanmer-core035-protected-20260824t142522z-dd4f69a4/pull/1
archived: false
created: '2026-08-20T10:14:42.535Z'
updated: '2026-08-25T01:06:28.850Z'
---

## What
end-to-end on a disposable repo + board: packet fetched → refusal paths → take → implement → PR → `kanmer/gate` observations → protected merge → exact-SHA verify. Proof is the command log.

## Verification
- [x] Exact merged source verify passed.
- [x] Disposable fixture focused tests and local gate/refusal matrix recorded.
- [x] Hosted NO_TICKET, WRONG_STAGE, warning, and unreachable-commit evidence retained.
- [x] Public disposable `main` protection and normal merge refusal observed: required `verify`/ `kanmer-gate`, approval, conversations, admin enforcement, and no force/delete.
- [ ] Protected merge and detached exact-SHA verification: INCONCLUSIVE — fixture-only canonical-origin setup cleared the prior release-notes URL mismatch, but the latest Windows `verify` run timed out in three existing core tests; this agent must not author-review or merge.

## Outcome
INCONCLUSIVE at the public-fixture verification and independent-review boundary. The public protected-branch configuration, two hosted `kanmer-gate` passes, prior HTTP 405 protected-merge refusal, and both retained `verify` failures are recorded. No review, merge, bypass, rule weakening, or fabricated exact-SHA claim was performed.
