---
id: CORE-138
type: ticket
title: >-
  Separate PR handoff from the strict review merge gate and make board re-gating
  reliable
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - ci
  - merge-gate
  - workflow
  - deferred
  - future-release
links:
  - SKILL-039
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
archived: false
created: '2026-09-02T09:44:31.715Z'
updated: '2026-09-02T09:44:31.715Z'
---

## Why

The current protected-PR workflow runs the strict `kanmer-gate` on PR creation before the normal execution handoff can record the PR, move the ticket to Review, and push the board. That creates an expected red check against an `implementing` snapshot. Board-push re-gating can then be lost while the original workflow's long `verify` job is still running, leaving a stale failure visible after the board reaches Review.

This was observed on [[SKILL-039]] / PR #312: the gate fetched the board before the Review-state push, and later dispatches could not refresh the job while its parent run remained active.

## Scope

Design one coherent CI handoff model that avoids treating normal pre-review incompleteness as a failure. Evaluate and choose between:

- draft-first PR handoff with draft gate suppression and a `ready_for_review` trigger;
- distinct implementation/handoff and independent-review checks;
- a neutral or pending pre-attestation state where GitHub permits it;
- reliable board-push re-gating that cannot be lost behind an in-progress verification rail.

Keep implementation verification available as early as useful. Preserve strict merge blocking for wrong stage, stale head/board evidence, missing or invalid independent review evidence at the actual merge boundary, and unresolved blocking findings.

Update the execute/review skills, workflow tests, governing documentation, and installed board re-gate workflow together with the selected behavior.

## Verification

- A normal fresh-ticket execution handoff does not leave an expected red required check.
- The first merge-gate judgment that claims Review reads a pushed board containing the PR reference and Review transition.
- A board update made while the PR verification rail is still running eventually re-evaluates the gate against the new remote board tip.
- A PR cannot merge without a valid current-head independent `scratch/review.md` attestation.
- Draft, ready-for-review, synchronize, PR-body edit, board-push, and main-push event paths have explicit automated coverage.
- CI does not launch redundant full verification rails merely to refresh board-dependent gate state.

## Outcome
