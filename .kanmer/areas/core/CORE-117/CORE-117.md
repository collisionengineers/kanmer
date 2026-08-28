---
id: CORE-117
type: ticket
title: Add quick capture mode and deliberate promotion workflow
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T00:53:14.228Z'
  review: '2026-08-28T02:20:16.444Z'
  verifying: '2026-08-28T02:53:43.029Z'
  done: '2026-08-28T03:51:59.184Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
refs:
  - docs/functional/frd/FRD-032-quick-capture-and-promotion.md
commits:
  - cbd05ca5dd925989c5d556aa00b2b60a0e2b0a98
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/298'
archived: false
created: '2026-08-26T21:02:41.985Z'
updated: '2026-08-28T04:29:07.048Z'
---

## What

Add a lightweight capture item that is visible and searchable without delivery-document debt, plus explicit promotion or archival outcomes.

## Why

Observations must be recordable quickly without entering unattended goal selection as malformed implementation tickets.

## Approach

- Require only concise observation metadata and optional evidence.
- Exclude captures from /goal and readiness metrics.
- Support duplicate, fixed, batch, normal-ticket, retained-capture and archive promotion outcomes.

## Verification

- [ ] A capture stays out of goal selection, then promotion records one deliberate disposition.

## Outcome

Shipped PR #298 (merge commit `bf0eaed49100ba6e25f37de2df883ebaf25c2dc5`), verified PASS at that exact SHA in proof.md (version `85e05a67f009b249`).

**What shipped:** the `capture` profile — title+observation-only capture with zero gate boundaries and no document debt at creation; visible-but-uncounted in epic/horizon progress (a capture is a group `member` but is excluded from `progress`/`total` readiness counts); six recorded dispositions (`duplicate | already-fixed | batch | promoted | retained | not-required`), each stamped with `capture_decided_at`/`capture_decided_by`; forward-only promotion (gates apply only from the moment of promotion onward — no retroactive document debt is synthesised for time spent as a capture); and delivery exclusion (`take_ticket`, `move_item` off Backlog, and `get_execution_packet` all refuse an unpromoted capture with `CAPTURE_NOT_PROMOTED`/`GATE_BLOCKED`).

**Disposition naming:** the implemented six-value enum maps 1:1 onto FRD-032's prose outcomes. This is a naming difference, not a gap: `already-fixed` = FRD-032's "fixed", and `not-required` = FRD-032's "archived". All six other implied effects (link+archive for `duplicate`, archive for `already-fixed`/`not-required`, profile change off `capture` for `batch`/`promoted`, unchanged for `retained`) match the FRD.

**Follow-ups (deferred out of HZN-008 by operator decision on 2026-08-28, open on the board as ordinary backlog, do not gate the horizon):**
- **CORE-130** — core-side capture hardening: `update_item {profile: ...}` with no disposition silently promotes a capture; a superseding disposition that omits `capture_result` leaves the prior result stale; `duplicate` accepts the capture's own id (self-duplicate); `dispatch_task` has no capture check anywhere in its path (unguarded); `create_item` is ungated so a capture can be born outside Backlog (inert but a dead-end area-default refusal).
- **GUI-145** — standup line, area-default selector, shared profile list, composer/filter.

**Deployment:** n/a — non-deployable core/MCP work; this board does not declare deployment tracking (no `deployment` block in board.yml), so no `deployment` field was set on the ticket.

**Residual risk:** the five confirmed-open defects recorded in proof.md's "Known open defects" section are dispositioned **accepted residual risk** under FRD-034 ("dispositioned minor/note findings may remain as explicit residual risk"), tracked by CORE-130/GUI-145 — not blockers to this ticket or to HZN-008.
