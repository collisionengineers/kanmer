---
id: CORE-142
type: ticket
title: >-
  Gate-only hosted check with a freshly fetched board and a blocking
  current-head attestation
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - ci
  - merge-gate
  - workflow
  - needs-admin
groups:
  - HZN-010
links:
  - CORE-138
  - CORE-139
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
archived: false
created: '2026-09-05T02:13:17.719Z'
updated: '2026-09-05T02:13:51.632Z'
---

## Problem

[[CORE-138]] (0.4.2) delivers the handoff subset: a PR body edit no longer cancels code verification, the merge gate is advisory on draft PRs, and `regate` waits for an in-progress run instead of skipping it. Two of CORE-138's original criteria cannot be closed inside a pull request because they need repository administration:

1. A **distinct gate-only required check** that evaluates the current PR head against a freshly fetched board revision, separate from the long `verify` job, so a board push during a running rail always gets its own final evaluation. Adding or renaming a required check changes branch protection.
2. A **blocking** current-head independent review attestation at the merge boundary. Today `check-pr.mjs` warns unless the repository variable `KANMER_GATE_STRICT` is `1`/`true`.

## Outcome

Both criteria are true on `collisionengineers/kanmer` with an explicit administrator handoff recorded on this ticket: the required-check identity retargeted, `KANMER_GATE_STRICT=1` set, and the workflow/skill/AGENTS.md prose updated in the same PR as the code change.

## Acceptance

- Board push during a running `verify` → the gate-only check re-evaluates the newest head/board pair after the current evaluation finishes; an older completion cannot overwrite the newer decision.
- A PR with a stale or missing current-head `scratch/review.md` attestation is blocked at the merge boundary (not merely warned).
- No `pull_request_target`; PR and board content are treated as data; no branch-protection bypass.
- `scripts/pr-workflow.test.mjs` and `packages/mcp-server/src/check-pr.test.mjs` cover the new required-check path and strict mode; the operator steps are written in AGENTS.md §6.

## Out of scope

Anything already delivered under CORE-138; the heavy-execution permit ([[CORE-143]]).

## Technical seam

`.github/workflows/pr.yml` (new job or split of `kanmer-gate`), `packages/mcp-server/src/check-pr.mjs`, `packages/core/src/review-attestation.ts`, `scripts/pr-workflow.test.mjs`.
