---
id: CORE-146
type: ticket
title: >-
  reconcile_ticket never recommends MOVE_TO_DONE after a squash merge because
  recorded branch commits are unreachable from the merge SHA
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - reconciliation
  - squash-merge
  - reliable-autonomy
groups:
  - HZN-010
links:
  - MCP-057
  - CORE-133
refs:
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
archived: false
created: '2026-09-05T04:25:13.842Z'
updated: '2026-09-05T04:25:13.842Z'
---

## Problem

`reconcile_ticket` reports `RECORDED_COMMIT_UNREACHABLE` for every ticket whose `commits[]` holds pre-squash branch commits, because a squash merge creates a new commit and the branch commits are never its ancestors by construction. On this repository every PR is squash-merged, so the read-only reconciler's `MOVE_TO_DONE` recommendation is effectively unreachable for any Verifying ticket with recorded implementation commits. Observed on MCP-057 (merge `e474f317`) during the first evidence-first verification on 2026-09-05; CORE-133 (Done, merge `c973f94a`) has the identical property. Verifiers currently fall back to a manual `move_item` after writing a PASS proof, which is safe but defeats the purpose of the inspector's recommendation.

## Outcome

Reconciliation distinguishes "recorded commit is contained in the merge" (its patch is part of the squash commit's diff, or the commit is an ancestor of the PR head that GitHub reports as merged) from "recorded commit is genuinely unreachable" (never merged anywhere), so a squash-merged ticket with a valid current PASS proof receives `MOVE_TO_DONE`.

## Acceptance

- A ticket whose `commits[]` are ancestors of the merged PR's recorded head (`gh pr view --json headRefOid`, or the `pullRequest.headSha` already in `ReconciliationEvidence`) and whose proof is a valid PASS at the merge SHA gets `MOVE_TO_DONE`; the finding, if kept, is informational.
- A commit reachable from neither the merge SHA nor the PR head still yields `RECORDED_COMMIT_UNREACHABLE` as an error.
- Existing CORE-133 tests (FAIL routing bound to the merge SHA) unchanged; new table cases for squash-merged PASS, squash-merged FAIL, and genuinely unreachable commit.
- `kanmer-verify` and `kanmer-closeout` prose updated to describe when the recommendation is expected.

## Out of scope

Rewriting historical `commits[]`; changing the merge strategy; any GUI change.

## Technical seam

`packages/core/src/reconciliation.ts` (commit reachability evidence and `RECORDED_COMMIT_UNREACHABLE`), `packages/mcp-server/src/reconciliation.ts` (`pullRequestEvidence`, where the host supplies `headSha`/`mergeSha` and could supply per-commit containment), `packages/core/src/reconciliation.test.ts`, `packages/mcp-server/src/reconciliation.test.mjs`.
