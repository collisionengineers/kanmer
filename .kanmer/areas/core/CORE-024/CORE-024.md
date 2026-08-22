---
id: CORE-024
type: ticket
title: >-
  Implement kanmer check-pr — ticket linkage and open-questions merge gate
  (phase 1)
status: review
area: core
order: 10
assignee: core024-executor
profile: fix
stageEntered:
  preparing: '2026-08-20T13:20:46.901Z'
  review: '2026-08-22T05:24:33.751Z'
taken_at: '2026-08-22T04:57:09.506Z'
branch: core-024-check-pr
worktree: .worktrees/core-024
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-025
refs:
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - b041e944ececdf433925b9e4168e003a4623fbce
prs:
  - '155'
archived: false
created: '2026-08-16T18:26:15.167Z'
updated: '2026-08-22T05:24:33.751Z'
---

## What
`kanmer check-pr` phase 1: a merge-gate CLI plus a GitHub Actions job (`kanmer-gate`) that fails a PR when it has no board ticket or the ticket has open questions.

## Why
GitHub is the merge boundary, and today nothing ties a PR to its board record — Pegasus shipped seven ticketless PRs after its board froze. Phase 1 lands the two checks that need no new record formats: `NO_TICKET` and `OPEN_QUESTIONS`.

## Approach
- `evaluateMergeGate` in `packages/core/src/merge-gate.ts`; CLI at `packages/mcp-server/src/check-pr.mjs`. JSON verdict on stdout, `::error::` workflow commands on stderr.
- Read-only `KanmerStore` over a fetched `kanmer-board` worktree — never call `init()`/`ensureInit()` (it would write a board skeleton into the CI worktree); `--board` must never point at the PR tree.
- Ticket resolution: PR-body footer `Kanmer: <ID>`, else branch prefix `/^([A-Z0-9]{2,6}-\d+)/i` (area prefixes are alphanumeric), else fail `NO_TICKET`.
- Open questions counted with core’s `countCheckboxes(…, { stopAtParked: true })` — parked questions pass; one checkbox parser, no second regex.
- Board fetch failure fails closed: exit 2 (check could not run) is distinct from exit 1 (check failed).
- GHA job `kanmer-gate` added to the PR workflow ([[CORE-032]]).

## Verification
- [ ] PR with no ticket reference fails `NO_TICKET`; footer and branch-prefix resolution both pass
- [ ] Ticket with open unparked questions fails `OPEN_QUESTIONS`; parked-only questions pass
- [ ] Board fetch failure exits 2 and the job fails
- [ ] `kanmer-gate` green on a compliant PR

## Outcome
