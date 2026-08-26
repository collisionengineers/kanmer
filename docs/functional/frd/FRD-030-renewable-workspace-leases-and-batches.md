---
status: draft
---

# FRD-030 — Renewable workspace leases and batches

**Implements:** PRD-002 requirement 3.

## Behaviour

Workspace ownership is a renewable lease rather than permanent evidence that a
worker is alive. A lease records lease, project, controller-run, worker-run and
workspace identifiers; assignee/provider identity; branch and worktree/location;
phase; claimed, heartbeat and expiry timestamps; and a revision. Heartbeat and
expiry durations are explicit testable configuration, with a reasonable initial
five-minute heartbeat and thirty-minute expiry.

Only one live writer owns a workspace. Isolated mode is the default: one ticket,
one branch and one workspace. Batch mode is deliberate: one controller owns one
workspace and branch for two or more small related tickets; membership freezes
when implementation starts. Every member retains its own outcome, acceptance,
review mapping and proof, while cleanup waits for all members to become
terminal. A ticket cannot occupy two active workspaces.

Lease acquisition and renewal are atomic and revision-safe. Reclaiming an
expired lease re-reads board, branch, worktree and PR evidence, preserves dirty
work, records the old/new controller and never treats expiry as deletion. Old
`taken_at`/branch/worktree data receives one migration path rather than a
permanent parallel ownership model.

## Acceptance criteria

1. A live competing controller cannot acquire or renew the same workspace.
2. A lease renews only with its current lease identifier and revision; stale
   renewal returns `LEASE_EXPIRED` or `REVISION_CONFLICT` without overwrite.
3. A dead lease can be safely recovered after inspecting a dirty worktree,
   committed-no-PR branch and branch-with-missing-worktree cases.
4. Three small related tickets complete in one frozen batch workspace with one
   PR/head attestation and member-specific verification evidence.
5. An unrelated ticket cannot join a started batch or share its workspace.

## Edge cases

- Long-running commands remain protected by controller renewal or an explicit
  running-command state.
- A final claim remains until closeout while its workspace is a valid execution
  or evidence target.
