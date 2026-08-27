---
id: CORE-123
type: ticket
title: >-
  Merge-gate hardening and board-sync confirmation (SYNC_REQUIRED, attestation
  errors, board-push CI trigger)
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-27T13:45:07.018Z'
  review: '2026-08-27T15:01:13.080Z'
  implementing: '2026-08-27T16:22:15.731Z'
  verifying: '2026-08-27T16:54:44.813Z'
  done: '2026-08-27T17:28:11.800Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
commits:
  - 3dad4b26
  - 2b3cf620
  - df293ad2bf4b7f603e67998be7cb5b62f9430cbe
  - 5684174ae60ae2d67874a63c1e0c308b29327c38
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/288'
archived: false
created: '2026-08-27T10:07:40.813Z'
updated: '2026-08-27T17:30:32.799Z'
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
- [ ] A push to `main` or a `workflow_dispatch` re-runs `kanmer-gate` on open PRs (`regate`). Pushing `kanmer-board` triggers that re-gate only once an operator has copied `.github/workflows/board-regate.yml` onto the board branch (operator-enabled, not automatic — `pr.yml` on `main` cannot observe board-branch pushes).
- [ ] GUI shows ahead-of-origin and `get_status` reports the counts.

## Outcome

- Merged: PR https://github.com/collisionengineers/kanmer/pull/288 (squash merge SHA `5684174ae60ae2d67874a63c1e0c308b29327c38`, merged 2026-08-27T16:54:22Z).
- Review: delta attestation `9be967bf37c9f808`. Proof: `a20b35df3a8a35a1`, result PASS at the merge SHA (hosted run 33095640744 green).
- Shipped differently than planned: `pr.yml` cannot observe `kanmer-board` pushes from `main`'s tree, so the board-push re-gate ships as `.github/workflows/board-regate.yml` that an operator installs on the board branch (not automatic). Push-to-`main` and `workflow_dispatch` re-gating are automatic.
- Operator step: copy `.github/workflows/board-regate.yml` onto the `kanmer-board` branch to enable board-push re-gating.
- Follow-up tickets: none created.
