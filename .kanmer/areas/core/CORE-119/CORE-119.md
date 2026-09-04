---
id: CORE-119
type: ticket
title: >-
  Build golden-board evaluations and stable-to-candidate promotion rollback
  proof
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-09-02T00:47:16.030Z'
  review: '2026-09-04T05:48:33.274Z'
  verifying: '2026-09-04T06:12:52.188Z'
  done: '2026-09-04T06:30:14.937Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
commits:
  - '646891e1'
  - 31878132b42edef52d3d18e9d84c600b860e5082
  - b1a1eee115db0aa63493bc3024957d69e0aa84a3
  - 04a977516fcb29500b5df2fd6aacea24e2e3d54e
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/318'
archived: false
created: '2026-08-26T21:02:42.079Z'
updated: '2026-09-04T06:31:00.912Z'
---

## What

Create disposable golden-board/provider evaluations and a stable-control-plane promotion procedure that proves candidate Kanmer can be upgraded and rolled back safely.

## Why

The new autonomy model must be demonstrated end to end while v0.3.12 remains the live board authority until promotion succeeds.

## Approach

- Cover the approved controller, lease, batch, capture, delivery, review, reconciliation, multi-project and release scenarios.
- Measure outcomes, corrections, churn and safety failures.
- Verify backup, promotion, CRUD/workflow acceptance and rollback against copied boards.


**Shipped (closeout 2026-09-04):** PR #318 squash-merged at 04a977516fcb29500b5df2fd6aacea24e2e3d54e (branch head b1a1eee1 after the reviewer updated it onto 59ded74b; implementation commits 646891e1, 31878132). Proof PASS at the merge SHA (local rail + hosted run 33843422690). Deviations recorded in the post-implementation report (GB-17 on the repo fixture; fixture plan pins evidence versions; coverage-gap full run exits 2; v0.4.0 fixture holds 18 typed attempts; GB-15 needs a second git repository; `stampClaim` writes claim frontmatter directly). Review: 0 blocker, 0 major, 1 minor (F-002: `driveCopiedBoard()` runs `--launcher` verbatim without binding it to `--board-copy`; carried into CORE-137's plan step 10j as an operator binding rule), 5 notes. The live promotion rehearsal is CORE-137's.

## Verification

- [ ] Required golden scenarios and a failed-promotion rollback complete with recorded evidence.

## Outcome
