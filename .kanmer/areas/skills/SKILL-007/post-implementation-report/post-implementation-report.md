# Post-implementation report

PR [#20](https://github.com/collisionengineers/kanmer/pull/20).

## Changes

| Path | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | The conversion procedure, six steps. |
| This board | 8 epics, 2 horizons, `groups` on 40 tickets. |

## Against the governing docs

**FRD-001 G7** — grouping labels become groups with derived membership.
**ADR-0001** — membership written to the ticket only; no member list exists
anywhere on disk.

## The bug the verification caught

The `NOW`/`NEXT` pass patched from the item list read before any writes. Those
tickets' stale `groups: []` overwrote the epic membership set moments earlier —
8 tickets, and the epic totals dropped by exactly 2 + 3 + 3.

It surfaced as three epics reporting `derived total == done count`, which is
what a group missing all its open members looks like. Fixed by re-reading before
each patch, and added to the skill as a numbered step: anyone writing membership
in two passes will hit it.

Worth noting the verification step was not decorative — without comparing
derived progress against the source labels, the board would have silently lost
membership on every open ticket.

## For review

**`bug` and `v3-blocker` were classified by judgement.** The skill offers a test
("could this label have a goal and a completion percentage?"), but the call is
still a human one. `v3-blocker` is arguably a grouping — it named one ticket, so
converting it would have produced an epic of one, and I read that as a property.

**The labels are still on the tickets.** Deliberate — dropping them in the same
pass makes the run irreversible — but it means the board now carries both, and
nothing schedules the cleanup. Worth a ticket once the groups are trusted.

**`NOW`/`NEXT` will go stale.** They were seeded from what is open today. As
those five GUI tickets close, `NOW` empties and nothing re-seeds it. Horizons
are a manual lens in v3; that is by design, but a reader seeing `NOW 0/5` in a
week should know it means "nobody re-groomed", not "nothing is in flight".

## What kanmer-verify should run

Each epic's derived `complete`/`total` against a direct label count; `NOW`'s
members against the open Phase 4–5 tickets; a re-run reporting zero patches; and
confirm no file on disk stores a member list.

## Reconciliation audit — 2026-08-22

This ticket was found in Implementing with historical implementation, review, merge and proof already recorded. The merged PR is [#20](https://github.com/collisionengineers/kanmer/pull/20), merge commit `f7a0ca61873398a1ff9e5a93e481acec9374367e`, and source commit `73e2e9cfa59af4488d539a2a7813a3317b1f5dd0` is reachable from current main. The current `kanmer-groom` source still contains the documented preview/confirm, ticket-owned membership, no-member-list, re-read-before-patch, source-count verification, idempotence, and roadmap-derived horizon procedure.

Fresh live MCP reads matched each phase label to its derived epic progress: Phase 0 4/4, Phase 1 3/3, Phase 2 8/8, Phase 3 3/3, Phase 4 8/8, Phase 5 4/5, Phase 6 4/5, Phase 7 3/4. Every EPIC-001 through EPIC-008 context was read; each names its plan and governing FRDs and states that membership/progress are derived from ticket groups. The `bug` and `v3-blocker` labels remain properties rather than conversion candidates.

The original NOW/NEXT proof was accurate at conversion time. It is intentionally a static horizon lens: HZN-001 now contains GUI-007/010/016/017 after they closed plus GUI-015 in Review; HZN-002 contains DOC-005 and SKILL-006 done plus SKILL-007 implementing. This current drift is documented by the existing proof and is not reported as a present-tense open-ticket match. No new code or dependency was needed, and no proof was fabricated.
