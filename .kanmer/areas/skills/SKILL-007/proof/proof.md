# Proof

PR [#20](https://github.com/collisionengineers/kanmer/pull/20), merged
(`73e2e9c`). Verified against the live board.

## Every epic's derived progress matches its source label

The ticket's stated criterion. Derived from `deriveMembers`, compared against a
direct count of tickets carrying the label:

| Group | Derived | Label count |
|---|---|---|
| EPIC-001 Phase 0 | 4/4 | 4/4 |
| EPIC-002 Phase 1 | 3/3 | 3/3 |
| EPIC-003 Phase 2 | 8/8 | 8/8 |
| EPIC-004 Phase 3 | 3/3 | 3/3 |
| EPIC-005 Phase 4 | 6/8 | 6/8 |
| EPIC-006 Phase 5 | 2/5 | 2/5 |
| EPIC-007 Phase 6 | 5/5 | 5/5 |
| EPIC-008 Phase 7 | 1/4 | 1/4 |

All eight match.

## The NOW filter matches reality

The ticket's second criterion. `HZN-001` members: **GUI-007, GUI-010, GUI-015,
GUI-016, GUI-017** — exactly the open Phase 4–5 tickets, each in `backlog`.
`HZN-002` holds DOC-005, SKILL-006, SKILL-007.

## Membership is derived, not stored

`grep -rl "members:" .kanmer/groups/` returns nothing. A group's file carries
only id, kind, title, archived and its goal line:

```
id: EPIC-005
kind: epic
title: 'Phase 4 — GUI: the new board model'
```

Plus `context.md`. The 40 memberships live on the tickets, which is ADR-0001's
whole point.

## Idempotent

Third run: **0 groups created, 0 tickets patched, 40 already members.** Not
merely harmless — a no-op `update_item` does not bump `updated`, so nothing on
the human's board moves.

## The bug my own verification caught

The first apply lost membership on 8 tickets: the NOW/NEXT pass patched from a
list captured before any writes, so a stale `groups: []` overwrote the epics
set moments earlier. It showed up as three epics reporting `total == done`.

Recording it because it is the argument for the verification step existing.
Without comparing derived progress against the source labels, the run would have
reported success and quietly dropped every open ticket's epic.

## Not proven

**The group view has still not been looked at.** GUI-014 now has real data —
eight groups with members, progress bars and per-stage counts — and that was the
gap its own proof named. Nobody has opened the app to see it render. The
underlying numbers are verified; the pixels are not.

**Horizons will go stale silently.** `NOW` was seeded from what is open today
and nothing re-seeds it. As those five tickets close it reads `0/5`, which means
"not re-groomed", not "nothing in flight". By design in v3, but a real trap.
