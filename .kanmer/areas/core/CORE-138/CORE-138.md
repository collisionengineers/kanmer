---
id: CORE-138
type: ticket
title: >-
  Stop a PR body edit from cancelling verify, keep the merge gate advisory on
  drafts, and make regate re-evaluate an in-progress run
status: implementing
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-05T02:57:08.520Z'
taken_at: '2026-09-05T02:58:13.328Z'
branch: CORE-138-gate-handoff
worktree: .worktrees/core-138
claim_expires_at: '2026-09-05T03:28:13.328Z'
claim_controller: claude-code
lease_id: f40b49e8-b658-4928-8379-939a5d5796c8
lease_revision: 1
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-138'
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T02:58:13.328Z'
labels:
  - ci
  - merge-gate
  - workflow
  - 0.4.2
groups:
  - HZN-009
links:
  - SKILL-039
  - CORE-139
  - CORE-142
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - 93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a
archived: false
created: '2026-09-02T09:44:31.715Z'
updated: '2026-09-05T03:07:48.878Z'
---

## Problem

The protected-PR workflow runs the strict `kanmer-gate` on PR creation before the normal execution handoff can record the PR, move the ticket to Review and push the board, so a fresh handoff shows an expected red check against an `implementing` snapshot. A board push while the long `verify` job is still running is lost because `regate` skips runs in progress (observed on [[SKILL-039]] / PR #312). Separately, every `pull_request` action shares one concurrency group with `cancel-in-progress`, so a PR **body edit** cancels the running `verify` job — the accepted-risk finding F-001 recorded on [[CORE-139]].

(Rescoped 2026-09-05 under [[HZN-009]]: bullets already delivered by CORE-139 — no full rail on `workflow_dispatch`, coalesced board dispatches, open-PR guard — are removed; the two criteria that need repository administration moved to [[CORE-142]].)

## Outcome

A normal fresh-ticket handoff (draft PR → record PR → Review → board push → ready) leaves no expected red required check; a body edit never cancels useful code verification; a board update made while the rail is running is re-evaluated once the run finishes; a PR cannot merge without a current-head `scratch/review.md` attestation under the existing strict variable.

## Acceptance

- `pr.yml` concurrency carves `edited` into its own group while `opened`/`synchronize` keep cancelling superseded runs; a body edit during `verify` leaves the run alive (AT-21).
- `kanmer-gate` runs on draft PRs in advisory mode (`check-pr.mjs --draft`: findings in the step summary, exit 0); ready PRs keep today's strict/warn behaviour (AT-19). No skipped required check sits Pending.
- `regate` waits for an in-progress run (`gh run watch`, bounded) and then re-runs the `kanmer-gate` job once, instead of skipping (AT-20, AT-23).
- `kanmer-execute` documents the draft-first handoff; `kanmer-review` states that review binds to the current head and that merge needs a current-head attestation (AT-22).
- `scripts/pr-workflow.test.mjs` covers draft, ready_for_review, synchronize, body edit, board push, main push and no-open-PR; `check-pr.test.mjs` covers `--draft` and a stale attestation. `verify` still skips `edited` and `workflow_dispatch`.

## Out of scope

A distinct gate-only required check and a blocking attestation (need branch-protection / repository-variable changes) — [[CORE-142]]. `pull_request_target` is never used.

## Technical seam

`.github/workflows/pr.yml` (`concurrency.group`, `kanmer-gate` step args, `regate` script), `packages/mcp-server/src/check-pr.mjs` (`--draft`), `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `plugins/kanmer/skills/kanmer-review/SKILL.md`, `packages/core/src/review-attestation.ts` (`parseReviewAttestation`), tests named above.
