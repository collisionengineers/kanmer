---
id: CORE-125
type: ticket
title: Serialise non-lease ticket writers against the lease lock (CORE-115 F-001)
status: review
area: core
assignee: claude-code-core125
profile: fix
stageEntered:
  preparing: '2026-08-27T22:25:43.478Z'
  review: '2026-08-27T22:53:19.960Z'
taken_at: '2026-08-27T22:28:45.248Z'
branch: core-125-serialise-ticket-writers
worktree: .worktrees/core-125
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-115
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
commits:
  - 437772d47c47d9ccd5bdaedf818976b287ba6f4e
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/296'
archived: false
created: '2026-08-27T20:05:41.631Z'
updated: '2026-08-27T22:53:19.960Z'
---

## What

CORE-115 (PR #293) put `takeTicket`/`renewTicket`/`transferTicket`/`releaseTicket` under `.kanmer/leases.lock` (`packages/core/src/store.ts` `withLeaseLock`), so lease verbs are atomic against each other. Every other writer of the same ticket file — `updateItem`, `moveItem` (including the CORE-121 backward-move that rewrites `claim_controller`/`review_round`), `setDoc`-driven revision changes and `expected_revision` CAS paths — still does an unlocked read → CAS → `writeFileAtomic`.

## Why

A concurrent unlocked `updateItem`/`moveItem` that read the ticket before a lease write completes can rename over it and silently revert the lease record (id/revision/expiry) or the claim fields. `expected_revision` is optional, so callers that omit it are not protected. This is the remaining half of CORE-114 F-009 and it undermines the one-live-writer ownership contract the live board will rely on.

## Approach

- Route every ticket-file mutation through the same board-wide lock (or a per-ticket lock that lease verbs also take) with the re-read inside the lock.
- Add a core test: concurrent `renewTicket` + `updateItem` from separate `KanmerStore` instances never lose the lease record.

## Verification

- [ ] Test above passes; existing 411 core tests unchanged.
