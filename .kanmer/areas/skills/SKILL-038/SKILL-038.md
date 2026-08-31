---
id: SKILL-038
type: ticket
title: >-
  Keep in-roster blocked dependents selectable so a goal run can order its own
  dependency chain
status: review
area: skills
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-28T07:14:56.353Z'
  review: '2026-08-28T07:45:24.771Z'
  implementing: '2026-08-28T13:08:50.695Z'
taken_at: '2026-08-28T07:20:16.060Z'
branch: skill-038-blocked-dependents
worktree: .worktrees/skill-038
labels:
  - reliable-autonomy
groups:
  - HZN-008
links:
  - SKILL-036
blocks:
  - CORE-119
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - 6aeaef23fffaf8820e18bf61ee8d70a9c1246cbc
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/304'
archived: false
created: '2026-08-28T06:35:43.709Z'
updated: '2026-08-31T01:31:25.261Z'
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

The defect is **pre-existing** — both sentences predate SKILL-036 and neither is changed by PR #302; the verifier confirmed zero diff hits in `links.ts`. SKILL-036 materially **amplifies** it: before, the only scope was one group; now area, list and board scopes make an internal dependency chain far more likely.

## Why this now blocks CORE-119

Added after SKILL-036's post-merge verification. **Two independent agents — the reviewer and the verifier, separately — concluded this defect lands squarely on CORE-119.** A golden-board terminal proof is very likely to contain a blocker and its dependent, since that is precisely the shape a dependency-ordering proof must exercise. Under the current behaviour the dependent is silently dropped before the freeze, so CORE-119 would either be unable to construct its scenario or would appear to pass while never exercising the ordering rule at all. The second outcome is worse than the first.

The `blocks` edge to CORE-119 was therefore added deliberately. It is a sequencing decision, not a discovered dependency.

## Also in scope (folded in, deliberately not filed separately)

**N-1 — a check pins less than its name claims.** From SKILL-036's verification: the check named "…and board **health**" pins that half only via `/get_status\.boardWorktree/`, a pattern also satisfied by the push-the-board section. Deleting the entire `- **Board worktree.**` preflight bullet therefore leaves check 19 green. Same class as the accepted F-012, but a new instance, and it undercuts the guarantee check 19 exists to provide. Fix the regex so the named clause is what is actually pinned, and add a mutation proving it.

**F-005 — the verification budget is unbounded.** `transient` is bounded only by judgment gates, never a counter. SKILL-036's verifier put the risk plainly: *nothing but its own discipline bounded how often it could have called a flake transient*. CORE-119 must **terminate**, so an unbounded retry class is a direct threat to the horizon's terminal proof — the verifier named this the sharper of the two CORE-119 risks it was asked about. Add a numeric bound on `transient` retries per ticket, recorded in the run record, after which the lane blocks with the exact refusal rather than retrying.

F-008 (the `current.md` pointer race) is **not** folded in: it needs a `packages/core` change and, per the same verifier, matters only if CORE-119 runs concurrent controllers, which a single-controller run does not.

## Approach

Distinguish blockers *inside* the frozen roster from blockers *outside* it:

- Retain a dependent whose every live blocker is itself in the roster, as queued work ordered after its blockers by the existing §2 rule.
- Exclude, with a reported reason, only a ticket blocked by something outside the roster.
- State the distinction where step 2 currently says "blocked", so the two rules stop contradicting.

Enforce it in `scripts/verify-skill-prose.mjs` check 19 with a fixture that fails when the distinction is removed, matching the standard SKILL-036 set — deleting the clause must fail that check **by name**, and must not fail a sibling.

## Provenance

Filed from the SKILL-036 PR #302 delta review (finding F-023, severity major, disposition `deferred-to-ticket`). Deferred rather than fixed in place because SKILL-036's remediation budget was spent and the defect is not introduced by that change. N-1 and F-005 were added from SKILL-036's post-merge verification (proof `147fd0a95938ae05`).

## Verification

- [x] A roster containing a blocker and its dependent freezes with **both** members and orders them into one serial lane.
- [x] A ticket blocked from outside the roster is still excluded, with its reason reported.
- [x] Deleting the board-worktree preflight bullet fails the check that names it (N-1).
- [x] A ticket exceeding the numeric `transient` retry bound blocks with the exact refusal instead of retrying (F-005).
- [x] `npm run verify:skills` passes, and each new clause has a mutation proving its named check fails on deletion without failing a sibling.
