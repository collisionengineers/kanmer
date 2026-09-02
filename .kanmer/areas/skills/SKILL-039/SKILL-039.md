---
id: SKILL-039
type: ticket
title: >-
  Encode the anti-churn amendment: obsolete-after-change disposition, root-cause
  classes, reconcile tools in verify/closeout/auto, board-push recheck before
  merge
status: verifying
area: skills
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-02T00:47:16.599Z'
  review: '2026-09-02T08:51:24.394Z'
  implementing: '2026-09-02T10:05:32.205Z'
  verifying: '2026-09-02T13:37:02.873Z'
taken_at: '2026-09-02T01:42:01.023Z'
branch: SKILL-039-anti-churn-amendment
worktree: .worktrees/skill-039
claim_expires_at: '2026-09-02T13:06:39.266Z'
claim_controller: claude-code
review_round: 1
lease_id: e7ed4a73-ed26-47b6-872f-9b3246726829
lease_revision: 11
lease_worker_run: skill039-remediation
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\skill-039'
lease_provider: codex
lease_phase: implementing
lease_heartbeat_at: '2026-09-02T12:36:39.266Z'
labels:
  - reliable-autonomy
  - review-budget
groups:
  - HZN-008
links: []
blocks:
  - CORE-119
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-028-rescue-and-reconciliation.md
commits:
  - 444f96052803be32012b26f42e2462e6d82b7ca7
  - f96ea1b62a4614ab1fed94e1cc583125672d92f3
prs:
  - '312'
archived: false
created: '2026-09-01T18:50:34.754Z'
updated: '2026-09-02T13:37:02.873Z'
---

## Why

CORE-127 (PR #307) went through nine Review → Implementing rounds with 34 findings that were variants of one parsing-authority mechanism. The operator's anti-churn amendment (the review-budget policy now recorded in HZN-008 `context.md`, "Review budget and root-cause rule") was never committed to the repository, so its vocabulary never reached the skills or core: `review-attestation.ts` has no `obsolete-after-change` disposition, no skill states the root-cause classification rule, and `kanmer-verify` / `kanmer-closeout` / `kanmer-auto` never tell an agent to call `reconcile_ticket` or `apply_reconciliation` on a stuck ticket. FRD-034's acceptance ("bounded review and verification loops with proven failure routing") is only partly executable without these.

## What

1. `packages/core/src/review-attestation.ts` `DISPOSITIONS`: add `obsolete-after-change`; `plugins/kanmer/skills/kanmer-review/SKILL.md` disposition enum matches; `scripts/verify-skill-prose.mjs` pins it.
2. `kanmer-review/SKILL.md`: new subsection **Root-cause classification** — when two findings arise from one mechanism, record one class and choose exactly one of: replace approach / revise plan / narrow the contract with a stated threat model / defer the whole class to one follow-up; never one patch or ticket per example. Add the outdated-thread rule (an outdated GitHub thread is `obsolete-after-change` unless reasserted against the current head) and the "what consumes no budget" list (re-audit of an unchanged head, restated finding, outdated thread, disposition edit, PR metadata, new minor/note), stated as the deliberate property of `backwardMoveEffects` in `store.ts`.
3. `kanmer-review/SKILL.md` merge step: re-check `git rev-parse` local board vs `origin/<board-branch>` immediately before `gh pr merge`, and state that thread resolution is enforced by GitHub branch protection (`required_conversation_resolution`) and is load-bearing.
4. `kanmer-verify`, `kanmer-closeout`, `kanmer-auto`: name `reconcile_ticket` (dry-run first) and `apply_reconciliation` as the first step on any resumed or suspicious Review/Verifying ticket, before manual re-reading.
5. `docs/functional/frd/FRD-034`: add an "Amendment — review budget and root-cause classes" section carrying the normative text; `.gitignore`: `goal.md`, `.infisical.json`.

## Not in scope

No new tool, stage, field beyond the one enum value, or workflow engine. No change to `backwardMoveEffects` behaviour.

## Verification

- [ ] `parseReviewAttestation` accepts `obsolete-after-change` and rejects an unknown value (unit test).
- [ ] `npm run verify` green, including `verify-skill-prose` pins for every new sentence.
- [ ] A reviewer following the updated skill on a fixture PR with one outdated thread dispositions it without a remediation round.
