---
id: CORE-113
type: ticket
title: Add dry-run-first rescue and reconciliation for delivery state
status: backlog
area: core
assignee: ''
profile: feature
stageEntered:
  preparing: '2026-08-26T21:45:23.896Z'
  review: '2026-08-26T22:15:29.820Z'
  implementing: '2026-08-26T22:36:35.233Z'
  backlog: '2026-08-27T09:58:39.019Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-114
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - 61927fffeced9f216d5849667357e63964345f2d
  - 83279d14638e874bd98ccf764ccd7844897c6993
  - db63fb4b150e956dafb88c75c99ff3088a0b72cc
prs:
  - '286'
archived: true
created: '2026-08-26T21:02:41.922Z'
updated: '2026-08-27T09:58:56.195Z'
---

## What

Provide a small, dependency-light reconciliation surface that inspects ticket, claim, workspace, Git, PR, check, merge, proof and release state, then proposes or explicitly applies safe recovery.

## Why

A partially broken phase workflow must not make the board unrecoverable or leave merged and verified tickets in invalid stages.

## Approach

- Support dry-run and explicit apply with an auditable proposed action.
- Cover invalid Review/Verifying states, abandoned claims, stale completed workspaces, and superseded or conflicting release attempts.
- Never delete dirty work or touch the board worktree.

## Verification

- [x] Fixture boards demonstrate each required invalid-state route and a dry-run never mutates state.

## Outcome

**Superseded by operator decision on 2026-08-27 (not delivered).** Implemented in `61927fffeced9f216d5849667357e63964345f2d`, remediated in `83279d14638e874bd98ccf764ccd7844897c6993`, hardened in `db63fb4b150e956dafb88c75c99ff3088a0b72cc`; PR #286 closed unmerged, branch `core-113-rescue-reconciliation` retained for reference.

Reason: mutating reconciliation cannot be made safe within this ticket. F-015 (proof write outside ticket CAS) needs a document-inclusive revision (CORE-114); expired-claim classification needs claim expiry/leases (CORE-115); typed verification-failure routing needs a proof failure class (review/verify skill contract). The review attestation at `db63fb4b` also predates Codex round 3 and omits four current P1 threads (git-common-dir worktree identity, missing-worktree merged recovery, verification-failure routing, expired-claim classification).

Successor work (see `scratch/notes.md` and HZN-008 context): a bootstrap ownership/backward-move contract first, then a read-only `reconcile_ticket` inspector salvaged from PR #286 (classifier, collector, reachability helper, tests — with check-order, missing-worktree, `--git-common-dir` and subprocess-timeout fixes), merge-gate/board-sync hardening and a review-consolidation skill contract in parallel, then CORE-114 → CORE-115 → mutating `apply_reconciliation`.
