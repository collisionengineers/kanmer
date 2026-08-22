---
id: CORE-025
type: ticket
title: >-
  Expand kanmer/gate — stage, dependency, review-SHA and commit-reachability
  checks (phase 2)
status: review
area: core
order: 20
assignee: core-025-gate
profile: fix
stageEntered:
  preparing: '2026-08-20T13:27:40.811Z'
  review: '2026-08-22T07:09:20.666Z'
taken_at: '2026-08-22T06:47:30.209Z'
branch: core-025-phase-2-gate
worktree: .worktrees/core-025
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
  - d338349ea44397887f74ef714563f6bbc880ea79
  - 65e364ad927ef151ba0cea59b123d20feaf095b4
  - 42f0ace65f8aaa7d4e4f95f516df823c0f14da7a
prs:
  - '159'
archived: false
created: '2026-08-16T18:26:15.191Z'
updated: '2026-08-22T07:45:04.662Z'
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
- [ ] Each check fires in a fixture: wrong stage, open blocker, stale review SHA, absent review record, unreachable commit
- [ ] Warnings are annotations; failures exit 1; the JSON verdict lists every check with its status

## Outcome
