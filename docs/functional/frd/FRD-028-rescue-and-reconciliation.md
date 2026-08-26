---
status: draft
---

# FRD-028 — Rescue and reconciliation

**Implements:** PRD-002 requirement 1.

## Behaviour

Kanmer provides a dependency-light reconciliation surface that reads the live
board, Git, GitHub, CI, workspace and release facts before it proposes or
applies a recovery action. It supports dry-run first and explicit apply second.
Each result names the inspected revision, claim/lease, controller and worker
identity, branch, worktree, dirty state, commits, PR/head/check state, merge
SHA, proof and release state.

The reconciler recognizes at least: merged PR still in Review; closed-unmerged
PR; Review with no PR or active worker; Verifying without merged SHA; PASS proof
still in Verifying; verification implementation or plan failure; expired claim
with dirty work, commits, a missing worktree or no surviving work; stale
terminal worktree/branch; superseded release attempt; and concurrent release
owners. An apply action re-reads current state, uses compare-and-swap protection
and records the old/new responsible controller and action.

It never silently deletes a dirty workspace, force-pushes, bypasses required
checks, or creates, switches, removes or mutates `.worktrees/kanmer` merely by
reconciling.

## Acceptance criteria

1. A dry-run fixture returns the current evidence and proposed action for each
   recognized invalid state without changing board, Git or workspace state.
2. An explicit apply corrects only a still-current proposed action and records
   an audit entry; a changed revision returns a structured conflict.
3. Merged Review tickets, PASS Verifying tickets, plan/implementation
   verification failures and abandoned claims route to their correct stages or
   terminal outcomes.
4. A dirty expired workspace is preserved and reported; cleanup only occurs for
   a terminal, clean, explicitly authorized target.
5. Board-worktree protection, required checks and immutable release evidence
   remain intact in every recovery path.

## Edge cases

- Missing GitHub credentials or unavailable GitHub/CI produces an inconclusive
  evidence state and a retry/backoff recommendation, never an invented merge
  or check result.
- Conflicting release attempts remain immutable evidence; only a recorded
  successor may supersede an older attempt.
