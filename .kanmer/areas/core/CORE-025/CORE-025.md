---
id: CORE-025
type: ticket
title: >-
  Expand kanmer/gate — stage, dependency, review-SHA and commit-reachability
  checks (phase 2)
status: done
area: core
order: 20
assignee: core-025-gate
profile: fix
stageEntered:
  preparing: '2026-08-20T13:27:40.811Z'
  review: '2026-08-22T07:09:20.666Z'
  verifying: '2026-08-22T07:51:14.827Z'
  done: '2026-08-22T07:51:19.224Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-035
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
  - docs/functional/frd/FRD-009-interrogative-workflow.md
commits:
  - d338349e
  - 65e364ad
  - 42f0ace6
  - c8ea0b77
prs:
  - '159'
archived: false
created: '2026-08-16T18:26:15.191Z'
updated: '2026-08-24T13:51:55.490Z'
---

## What
Expand `kanmer/gate` to phase 2: `WRONG_STAGE` and `DEPENDENCY_BLOCKED` fail the PR; `STALE_REVIEW`, `NO_REVIEW_RECORD` and `COMMITS_UNREACHABLE` warn now and flip to fail once records are routine.

## Why
Phase 1 only proves linkage. Pegasus merged work whose ticket never reached review, whose dependencies were still open, and whose recorded commits were unreachable from any ref — seven tickets walked the full pipeline producing zero repository diff.

## Approach
- `WRONG_STAGE`: fail unless the ticket is in `review`.
- `DEPENDENCY_BLOCKED`: fail on live blockers via the link graph’s derived `blockedBy` filtered to non-done, non-archived — never `computeBlockedIds`, which returns blocked targets (the opposite direction).
- `STALE_REVIEW`: warn when `scratch/review.md` frontmatter `head_sha` differs from the PR head (frontmatter via gray-matter, never a regex).
- `NO_REVIEW_RECORD`: warn when no review attestation exists.
- `COMMITS_UNREACHABLE`: warn when any SHA in the ticket’s `commits[]` is not reachable from the PR base — kills the zero-diff / unreachable-SHA class; warn now, fail later.

## Verification
- [x] Each check fires in a fixture: wrong stage, open blocker, stale review SHA, absent review record, unreachable commit
- [x] Warnings are annotations; failures exit 1; the JSON verdict lists every check with its status

## Outcome

PR #159 (https://github.com/collisionengineers/kanmer/pull/159) merged to origin/main as c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b. Phase-two kanmer-gate checks now fail closed for wrong stage, live and dangling blockers, validate complete review attestations, and warn on stale/unreachable records while preserving the phase-one exit contract. Current-main proof records canonical `npm run verify` exit 0, a compliant current PR with both gate checks green, and a direct board-sync non-trigger observation. The warning-only compatibility policy remains deliberate.
