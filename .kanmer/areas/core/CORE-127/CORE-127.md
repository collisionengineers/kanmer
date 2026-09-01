---
id: CORE-127
type: ticket
title: >-
  Detect forbidden-file changes, stale evidence and plan deviation before the
  next step packet
status: review
area: core
assignee: codex-release-controller
profile: feature
stageEntered:
  preparing: '2026-08-31T15:53:50.295Z'
  review: '2026-08-31T19:55:04.505Z'
  implementing: '2026-08-31T20:20:05.964Z'
taken_at: '2026-08-31T17:37:10.569Z'
branch: core-127-constrained-step-reconciliation
worktree: .worktrees/core-127
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md
commits:
  - 5a8c5faef89a70b2f4c8b350e1f9314cc6fa62c6
  - fbeab7630d6d287c90f1d59da596890ae507b0be
  - fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7
  - 5302e445dc70714e89762dc19fb96754490e3fa9
  - 7d899869523ac5b55ef2debbf67d0324ebe4fb78
  - 437c7182021137eae962228942b712b2045cdc57
prs:
  - '307'
archived: false
created: '2026-08-27T23:06:18.794Z'
updated: '2026-09-01T00:21:26.216Z'
---

## What

Give the controller the reconciliation half of FRD-033: after a worker returns
from one bounded step packet, compare the actual worktree changes, the recorded
document versions and the completed step against the packet that authorised
them, and report typed findings before another packet is issued.

## Why

[[CORE-118]] compiles a bounded step packet with allowed files, allowed
symbols, forbidden files, tests, expected output and a stop condition, and it
records the exact plan/evidence versions the packet was built from. Nothing yet
checks what the worker *actually* did against that packet, so a weak worker can
still edit a forbidden file, work from a plan that changed underneath it, or
skip its step — and the controller would dispatch the next step anyway.

Splitting this out keeps CORE-118 one reviewable PR: compilation is pure and
board-local, whereas detection needs Git observation and belongs with the
existing read-only `reconcile_ticket` inspector (CORE-122).

## Approach

- Extend the read-only `reconcile_ticket` inspector (never a new tool) with a
  step-packet-aware mode: given a packet id/digest, collect `git status` /
  `git diff --name-only` facts from the recorded workspace and classify each
  changed path as allowed, forbidden or undeclared.
- Compare the packet's recorded plan/research/files/group-context versions and
  ticket `revision` (CORE-114) with the live values; report `stale` rather than
  silently accepting a packet built from a superseded plan.
- Report plan deviation: the step the packet authorised versus the checklist
  boxes and documents that actually moved.
- Keep every finding advisory and typed, with unavailable Git/GitHub facts
  reported as inconclusive — the inspector stays read-only, with no apply
  surface.

## Verification

- [ ] A fixture worktree that touches a file outside the packet's allowed list
      produces a forbidden/undeclared finding, and one that stays inside does
      not.
- [ ] A packet whose recorded plan version no longer matches the live document
      is reported as stale before another step advances.
- [ ] An unreadable or absent workspace is inconclusive, not a false pass, and
      the inspector writes nothing.

## Outcome
