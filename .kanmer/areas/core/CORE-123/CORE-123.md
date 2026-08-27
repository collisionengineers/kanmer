---
id: CORE-123
type: ticket
title: >-
  Merge-gate hardening and board-sync confirmation (SYNC_REQUIRED, attestation
  errors, board-push CI trigger)
status: backlog
area: core
assignee: ''
profile: feature
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
archived: false
created: '2026-08-27T10:07:40.813Z'
updated: '2026-08-27T10:07:40.813Z'
---

## What

Make the CI gate and the board agree before anything is called final: attestation checks become errors, a stale remote board is a structured `SYNC_REQUIRED` failure, the gate re-runs when the board branch is pushed, and the GUI/MCP surface board-sync drift.

## Why

`merge-gate.ts` treats `NO_REVIEW_RECORD`, `STALE_REVIEW`, `needs-changes` and `COMMITS_UNREACHABLE` as warnings, so a `needs-changes` PR can pass CI. `pr.yml` reads the live `kanmer-board` tip but only runs on `pull_request` events; the GUI auto-sync defaults to off and the MCP server never pushes, so CORE-113's gate judged a board 9h stale and nothing re-ran it.

## Approach

- `packages/core/src/merge-gate.ts`: promote the four attestation/commit checks to `error`; add `BOARD_STALE`/`SYNC_REQUIRED` when the attestation's recorded `board_sha` is not an ancestor of the fetched board tip; include the evaluated board SHA in the result. Gate behind repo variable `KANMER_GATE_STRICT` for one release.
- `packages/mcp-server/src/check-pr.mjs`: parse `board_sha`, `threads_snapshot`, `expected_reviewers` (warn-only until strict).
- `.github/workflows/pr.yml`: add `workflow_dispatch` and a `push: branches: [kanmer-board]` job that re-runs the gate for open PRs.
- `apps/gui/src/main/kanmerGit.ts` / settings: show ahead-of-origin state; default `gitSyncMinutes` to 5 when a remote exists; `get_status` reports `boardSync: {ahead, behind}`.

## Verification

- [ ] check-pr fixtures: `needs-changes` fails; missing attestation fails; stale `board_sha` yields `SYNC_REQUIRED`; strict flag off keeps warnings.
- [ ] Pushing `kanmer-board` triggers a gate run on an open PR.
- [ ] GUI shows ahead-of-origin and `get_status` reports the counts.

## Outcome
