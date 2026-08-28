---
id: SKILL-038
type: ticket
title: >-
  Keep in-roster blocked dependents selectable so a goal run can order its own
  dependency chain
status: backlog
area: skills
assignee: ''
profile: fix
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - SKILL-036
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
archived: false
created: '2026-08-28T06:35:43.709Z'
updated: '2026-08-28T06:35:43.709Z'
---

## What

`kanmer-auto` §1 step 2 says "Drop archived or **blocked** tickets", while §2 says "a `blocks` edge orders the blocker before its dependent regardless of file disjointness". For a roster containing both a blocker and its dependent, these two rules contradict, and the §2 ordering rule is unreachable.

## Why it is real

`blockedSet()` (`packages/mcp-server/src/index.ts:412`) calls `store.listItems({ includeArchived: true })` and hands the whole board to `computeBlockedIds` (`packages/core/src/links.ts:61`), which marks a target blocked whenever **any** live item that `blocks` it is not at the last stage:

```ts
for (const target of item.blocks ?? []) {
  if (item.status !== lastStageId) blocked.add(target);
}
```

The blocker's membership in the run is irrelevant — the computation is board-wide. So when a scope contains blocker A and dependent B, `list_items` reports B as blocked, step 2 drops B **before the roster is frozen**, and the freeze then prevents B from ever joining. The run reports a roster that silently excludes exactly the work the dependency ordering exists to sequence.

A live example on this board: SKILL-036 `blocks: ["CORE-119"]` and is not Done, so CORE-119 is currently marked blocked.

## Impact

Defeats FRD-034's Behaviour clause "The controller orders dependencies" and weakens AC1 ("reaches a terminal disposition for every member"), because dependents are dropped rather than queued.

The defect is **pre-existing** — both sentences predate SKILL-036 and neither is changed by PR #302. SKILL-036 materially **amplifies** it: before, the only scope was one group; now area, list and board scopes make an internal dependency chain far more likely.

## Approach

Distinguish blockers *inside* the frozen roster from blockers *outside* it:

- Retain a dependent whose every live blocker is itself in the roster, as queued work ordered after its blockers by the existing §2 rule.
- Exclude, with a reported reason, only a ticket blocked by something outside the roster.
- State the distinction where step 2 currently says "blocked", so the two rules stop contradicting.

Enforce it in `scripts/verify-skill-prose.mjs` check 19 with a fixture that fails when the distinction is removed, matching the standard SKILL-036 set.

## Provenance

Filed from the SKILL-036 PR #302 delta review (finding F-023, severity major, disposition `deferred-to-ticket`). Deferred rather than fixed in-place because SKILL-036's remediation budget was spent and the defect is not introduced by that change.

## Verification

- [ ] A roster containing a blocker and its dependent freezes with **both** members and orders them into one serial lane.
- [ ] A ticket blocked from outside the roster is still excluded, with its reason reported.
- [ ] `npm run verify:skills` passes, and a fixture proves the new check fails when the clause is deleted.
