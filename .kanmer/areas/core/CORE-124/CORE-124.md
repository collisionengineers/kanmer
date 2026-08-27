---
id: CORE-124
type: ticket
title: Add deliberate batch workspaces on top of renewable leases
status: done
area: core
assignee: claude-code-core124
profile: feature
stageEntered:
  preparing: '2026-08-27T20:47:48.964Z'
  review: '2026-08-27T21:10:03.643Z'
  verifying: '2026-08-27T21:18:53.730Z'
  done: '2026-08-27T22:09:51.481Z'
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
  - 9c9a6980e34aeaa43a691526d2715fe8fb97d6ce
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/295'
archived: false
created: '2026-08-27T19:22:20.928Z'
updated: '2026-08-27T22:18:08.701Z'
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

- [x] Three-ticket batch fixture: one workspace, one PR head attestation, three proofs.
- [x] Unrelated ticket refused from a started batch and from its workspace.
- [x] Cleanup waits for all members terminal.

## Outcome

Shipped as PR [#295](https://github.com/collisionengineers/kanmer/pull/295), squash-merged 2026-08-27 as `9c9a6980e34aeaa43a691526d2715fe8fb97d6ce` (branch `core-124-batch-workspaces`).

- **Review:** attestation v2 by `claude-code-core124-independent-reviewer`.
- **Proof:** `e279c645fcceaf2c` — **PASS** at the exact merge SHA. All packet checks green (core 417/417, smoke 306/306, protocol 50/50, plugin:check 39 tools, typecheck, verify:skills); the only local `npm run verify` failure was the known antigravity EBUSY host quirk in `scripts/` — an area the merge does not touch — compensated by green hosted verification at the same SHA. FRD-030 AC4/AC5 verified manually on throwaway boards (declare-and-freeze three-ticket batch on one workspace with one head attestation and three member-owned proofs; `WORKSPACE_OCCUPIED` / `BATCH_FROZEN` / `BATCH_INVALID` / `BATCH_WORKSPACE_MISMATCH` refusals with byte-identical board files; `BATCH_ACTIVE` release refusal until every member is terminal).

### Shipped differently than planned

Batch state landed as `lease_batch` / `lease_batch_frozen_at` frontmatter fields on each member rather than a separate `.kanmer/batches/<id>.md` record — the membership set is derivable from the members themselves, so a second file would have been a redundant source of truth.

### Follow-ups (deferred, not part of this ticket)

- [[CORE-126]] — merge-gate multi-footer batch roster (**major**), closeout roster discovery, and batch hardening.
- [[CORE-125]] — sibling-stamp lock coverage.
