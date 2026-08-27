---
id: CORE-124
type: ticket
title: Add deliberate batch workspaces on top of renewable leases
status: review
area: core
assignee: claude-code-core124
profile: feature
stageEntered:
  preparing: '2026-08-27T20:47:48.964Z'
  review: '2026-08-27T21:10:03.643Z'
taken_at: '2026-08-27T20:52:23.804Z'
branch: core-124-batch-workspaces
worktree: .worktrees/core-124
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-115
blocks:
  - SKILL-036
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
commits:
  - 14cf7083d08eb406aa30361ddca6fcedc94af4f5
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/295'
archived: false
created: '2026-08-27T19:22:20.928Z'
updated: '2026-08-27T21:10:03.643Z'
---

## What

Implement FRD-030 batch mode on the lease model that [[CORE-115]] lands: one controller owns one workspace and branch for two or more small related tickets; membership freezes when implementation starts; each member keeps its own outcome, acceptance, review mapping and proof; cleanup waits until every member is terminal; an unrelated ticket cannot join a started batch or share its workspace.

## Why

FRD-030 acceptance 4 and 5 (three-ticket frozen batch with one PR/head attestation and member-specific verification evidence; refusal of an unrelated ticket) need a batch record and membership rules on top of the one-writer-per-workspace invariant. CORE-115 research found this separable: the lease/workspace contract already refuses a second ticket in an occupied workspace, and batch mode is exactly the deliberate exception to that rule, so it can land as its own bounded PR without a parallel ownership model.

## Approach

- Batch record (`lease_batch` on each member: batch id, controller, frozen flag) or a small `.kanmer/batches/<id>.md` record; membership set before implementation and frozen by the first member take.
- `take_ticket` accepts the same workspace only for members of the same frozen batch (extends the `WORKSPACE_OCCUPIED` rule CORE-115 introduces).
- Member-specific `scratch/review` mapping and proof stay per ticket; one PR/head attestation is referenced by every member.
- Closeout refuses worktree removal while any member is non-terminal.
- Skill contract updates (execute/closeout/auto) for batch lanes.

## Verification

- [ ] Three-ticket batch fixture: one workspace, one PR head attestation, three proofs.
- [ ] Unrelated ticket refused from a started batch and from its workspace.
- [ ] Cleanup waits for all members terminal.

## Outcome
