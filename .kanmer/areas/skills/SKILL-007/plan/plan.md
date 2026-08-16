# Plan

## The procedure, in kanmer-groom

1. **Find** labels that look like a grouping — a shared prefix across several
   tickets (`v3-phase-*`, `epic-*`, `q3-*`). Never convert a label that
   describes a *property* (`bug`, `blocked`, `security`): those are labels doing
   a label's job.
2. **Preview** the full mapping — label → proposed group, ticket count, current
   completion — and stop for confirmation. This writes to every matched ticket.
3. **Create** one group per label, with a `context.md` pointing at the plan and
   governing documents that bind its members.
4. **Set `groups`** on each ticket. Never write a member list; membership lives
   on the ticket (ADR-0001) and members are derived.
5. **Leave the labels.** Removing them in the same pass makes the run
   irreversible for no benefit; a follow-up can drop them once the groups are
   trusted.
6. **Idempotent by construction** — a ticket already naming the group is
   skipped, and `update_item` does not bump `updated` for a no-op patch, so a
   second run costs nothing and changes nothing.

## The run on this board

8 epics, one per phase, each `context.md` naming the phase plan and the FRDs its
tickets reference.

2 horizons from the roadmap's real sequencing, not invented urgency: `NOW` =
remaining Phase 4–5 GUI work, `NEXT` = remaining Phase 7 self-adoption. Phase 7
runs after Phase 6 by the plan, so the split is the plan's.

`bug` and `v3-blocker` untouched.

## Verification

The ticket names it: every `v3-phase-N` label has a corresponding epic with
correct derived progress, and the `NOW` filter matches reality.

Both are checkable — compare each group's derived `complete`/`total` against a
direct count of tickets carrying the label, and assert `NOW`'s members are
exactly the open Phase 4–5 tickets. Then re-run and assert nothing changed.
