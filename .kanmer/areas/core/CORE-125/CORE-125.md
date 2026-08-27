---
id: CORE-125
type: ticket
title: Serialise non-lease ticket writers against the lease lock (CORE-115 F-001)
status: done
area: core
assignee: claude-code-core125
profile: fix
stageEntered:
  preparing: '2026-08-27T22:25:43.478Z'
  review: '2026-08-27T22:53:19.960Z'
  verifying: '2026-08-27T23:07:25.806Z'
  done: '2026-08-27T23:29:56.132Z'
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
  - c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/296'
archived: false
created: '2026-08-27T20:05:41.631Z'
updated: '2026-08-27T23:52:41.626Z'
---

## What

CORE-115 (PR #293) put `takeTicket`/`renewTicket`/`transferTicket`/`releaseTicket` under `.kanmer/leases.lock` (`packages/core/src/store.ts` `withLeaseLock`), so lease verbs are atomic against each other. Every other writer of the same ticket file — `updateItem`, `moveItem` (including the CORE-121 backward-move that rewrites `claim_controller`/`review_round`), `setDoc`-driven revision changes and `expected_revision` CAS paths — still does an unlocked read → CAS → `writeFileAtomic`.

## Why

A concurrent unlocked `updateItem`/`moveItem` that read the ticket before a lease write completes can rename over it and silently revert the lease record (id/revision/expiry) or the claim fields. `expected_revision` is optional, so callers that omit it are not protected. This is the remaining half of CORE-114 F-009 and it undermines the one-live-writer ownership contract the live board will rely on.

## Approach

- Route every ticket-file mutation through the same board-wide lock (or a per-ticket lock that lease verbs also take) with the re-read inside the lock.
- Add a core test: concurrent `renewTicket` + `updateItem` from separate `KanmerStore` instances never lose the lease record.

## Verification

- [x] Test above passes; existing 411 core tests unchanged.

## Outcome

Merged as PR #296 (https://github.com/collisionengineers/kanmer/pull/296), merge commit c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa on top of PR-head commit 437772d47c47d9ccd5bdaedf818976b287ba6f4e, merged 2026-08-27. Independent review attestation version d3357fef1f79e77f (reviewer claude-core125-independent-reviewer). Post-merge verification proof version 7c5cad2c902624f5, result PASS (verified at the exact merge SHA in a disposable detached worktree).

The verifier proved cross-process exclusion (two separate OS processes, 119 lease renewals + 173 unprotected `updateItem` writes against one ticket file, zero errors/conflicts, monotonic `lease_revision`), no deadlock under nesting (both the CORE-121 backward-move re-entrancy path and the lease-verb re-entrancy path completed well within a hard watchdog), stale-lock reclaim (a genuinely dead-pid lock past the stale window did not wedge the board; a live lock caused a loud, correct refusal), and compatibility with the previously installed stable server (v0.3.12) even with lock/owner-marker files present.

The hosted push-to-main verification run failed once at the merge SHA on a `store.test.ts` 5 s test timeout, and passed on an unmodified rerun at the same SHA — recorded as a runner flake, not a regression, and corroborated by a clean local 420/420 core run and direct nesting-path timing (575 ms / 52 ms, no hang).

No follow-up tickets were filed; the following are accepted-risk observations carried forward rather than filed as new work:
- F-001: the lock is timeout-based (not wait-based) and not FIFO.
- F-002: watcher lock-artifact noise in `apps/gui`.
- F-003: `deleteItem` remains the only unlocked ticket-file mutation, with no CAS.
- F-004: the `AsyncLocalStorage` re-entrancy guard is convention-only (a future fire-and-forget write started inside a critical section and awaited outside it would inherit "held" and skip locking; no such caller exists today).
- The verifier also noted that stale-lock refusal surfaces as a raw `EEXIST` errno rather than a domain-coded retryable error.
