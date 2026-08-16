# Labels → epic groups

## The input, measured

8 phase labels across 40 tickets, and **zero groups** on the board:

| Label | Tickets | Done |
|---|---|---|
| v3-phase-0 | 4 | 4 |
| v3-phase-1 | 3 | 3 |
| v3-phase-2 | 8 | 8 |
| v3-phase-3 | 3 | 3 |
| v3-phase-4 | 8 | 6 |
| v3-phase-5 | 5 | 2 |
| v3-phase-6 | 5 | 5 |
| v3-phase-7 | 4 | 1 |

Two non-phase labels — `bug` (4) and `v3-blocker` (1) — must be left alone.
They are labels doing a label's job; the conversion is only for labels faking a
grouping.

## This is the first real data GUI-014 will see

The group detail view shipped with derived members, a progress bar and per-stage
counts, and its proof recorded that it had never been rendered against a group
with members because none existed. This creates eight.

## Why labels were the wrong home

PRD-001 problem 2: real boards fake epics and horizons with labels doing triple
duty. `v3-phase-4` is not a label — it is an epic with a plan document, a set of
FRDs and a completion state. As a label it has no title, no shared context, and
no progress; you can filter by it and nothing else.

## Membership stays on the ticket

ADR-0001. The conversion writes `groups: [EPIC-00N]` onto each ticket and
creates the group; it never writes a member list. `deriveMembers` computes
members and progress from the tickets, so the group file holds only goal and
context.

That also makes the conversion naturally idempotent: re-running it finds the
membership already present and skips.

## Horizons, honestly

The ticket says seed `NOW`/`NEXT` "from what is actually in flight". Eight
tickets remain and all are queued in one session, so a split by *urgency* would
be invented.

There is a real ordering to use instead: the roadmap runs Phase 7 self-adoption
after Phase 6. So `NOW` is the remaining GUI work (Phases 4–5) and `NEXT` is the
remaining self-adoption work (Phase 7). That is the plan's own sequencing, not a
guess.

## Preview-first is not optional here

This writes to 40 tickets. `update_item` stamps `updated`, which the GUI watcher
and staleness reporting both key off, so a mistaken run is visible on every card
at once. Print the full mapping and the counts before writing anything.

## The skill, not just the run

The ticket says "kanmer-groom's conversion". The deliverable is the procedure in
the skill *and* its first execution here. A one-off script would leave the next
board with the same label problem.
