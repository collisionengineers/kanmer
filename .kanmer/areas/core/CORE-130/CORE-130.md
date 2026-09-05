---
id: CORE-130
type: ticket
title: >-
  Harden capture promotion: unrecorded profile promotion, stale superseded
  result, self-duplicate, dispatch surface
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - reliable-autonomy
groups:
  - HZN-010
links: []
refs:
  - docs/functional/frd/FRD-032-quick-capture-and-promotion.md
archived: false
created: '2026-08-28T02:56:18.633Z'
updated: '2026-09-05T02:15:11.427Z'
---

## What

Four defects the independent review of [[CORE-117]] (PR #298, head `cbd05ca5`, attestation `scratch/review.md` version `67020261ebcb09d2`) reproduced against the built core and dispositioned accepted-risk for a follow-up. All are narrow; none blocked the merge; each is recorded here verbatim so it is not lost.

- **F-001 — promotion without a record.** A bare `update_item {profile: <non-capture>}` promotes a capture with no recorded disposition, actor or timestamp, and the ticket then moves freely. Reproduced: `profile=chore disposition=NONE`, then a clean move to Preparing. FRD-032 locks *delivery* — take, move, execution packet — not the `profile` field, so this is not a delivery escape, and a bare profile edit is a deliberate human act rather than the autonomous selection the FRD guards against. It is also, today, the only correction path for a mis-recorded terminal disposition that `CAPTURE_ALREADY_DISPOSED` otherwise freezes. Fixing it must therefore keep an escape hatch: either require a disposition on any profile change away from `capture`, or add an explicit correction verb.
- **F-006 — stale result survives supersession.** A superseding disposition that omits `capture_result` keeps the previous decision's result, so the frontmatter records a new disposition beside a stale result. Reproduced: `retained` + result `STALE-RESULT-123`, superseded by `promoted`, yields `disposition=promoted result=STALE-RESULT-123`. A genuine audit-integrity defect in new code; narrow only because `retained` requires no result, so the stale value exists only when a caller volunteered one on a decision that did not need it.
- **F-007 — self-duplicate.** `capture_disposition: duplicate` accepts the capture's own id as `capture_result`, linking the ticket to itself and archiving it as its own duplicate. Reproduced (`links=["TICK-002"]` on TICK-002, `archived: true`). Reachable by a typo.
- **F-003 — dispatch surface unguarded.** `dispatch_task` (`packages/mcp-server/src/index.ts:966-972`) checks archived, taken and task feasibility but not the capture profile, so a background agent can be dispatched at an unpromoted capture. Mitigated today by dispatch being disabled behind an operator allowlist and approval, and by GUI dispatch being a per-card human action; FRD-032 names goal selection, roster and readiness as the exclusions, not dispatch.

Also in scope, from **F-004**: when an area default is set to `capture`, the resulting refusal is a dead end — the ticket freezes with `CAPTURE_NOT_PROMOTED` and the suggested remedy is itself refused with `CAPTURE_DISPOSITION_INVALID: not a capture, profile "unset"`. The unsupported configuration is a recorded decision (see `plan/plan.md` Constraints and `docs/manual/profiles.md`), but the error text should name the area default as the cause instead of dead-ending.

## Why

CORE-117 delivered FRD-032's acceptance criteria and the review confirmed acceptance 2 mechanically rather than by argument. These are the residue: an audit trail that can be bypassed or left inconsistent, and one refusal that gives no route out. They are cheap to fix now and awkward to fix once captures are in daily use.

## Approach

- Decide the F-001 contract first, because the others depend on it: either every departure from `profile: capture` must carry a disposition, or an explicit correction path exists for a mis-recorded terminal disposition. Do not simply forbid the bare edit and strand `CAPTURE_ALREADY_DISPOSED`.
- Clear `capture_result` when a superseding disposition omits it, rather than inheriting it.
- Refuse `duplicate` naming the capture's own id.
- Add the capture check to `dispatch_task` alongside its archived/taken checks.
- Give the area-default refusal an error that names the cause.
- Tests for each, in a new file rather than by appending to the core suites another lane may be editing.

## Verification

- [ ] A capture cannot leave `profile: capture` without a recorded disposition, and a mis-recorded terminal disposition still has a documented correction path.
- [ ] A superseding disposition that omits a result clears the previous one.
- [ ] `duplicate` naming the capture's own id is refused.
- [ ] `dispatch_task` refuses an unpromoted capture.
- [ ] The area-default-`capture` refusal names the area default as the cause.
