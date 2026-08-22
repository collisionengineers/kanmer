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

## Current reconciliation — 2026-08-22

The merged source and live board were re-read. PR #20 merge `f7a0ca61873398a1ff9e5a93e481acec9374367e` and source `73e2e9cfa59af4488d539a2a7813a3317b1f5dd0` are recorded above and reachable from main. Direct MCP label counts still equal each epic's derived progress: 4/4, 3/3, 8/8, 3/3, 8/8, 4/5, 4/5, and 3/4 for phases 0–7. The phase group contexts and ticket-owned memberships remain present.

HZN-001 and HZN-002 are intentionally static seeded lenses, not auto-maintained open-only filters. Current members therefore include completed tickets; the live state is recorded rather than incorrectly claiming the historical NOW/NEXT open roster still holds. This is consistent with the proof's existing “horizons will go stale silently” warning. No unavailable visual/manual evidence is upgraded to PASS.

## Merged-main verification — 2026-08-22

Verification ran against the merged `main` line, not the feature worktree. Git confirmed source commit `73e2e9cfa59af4488d539a2a7813a3317b1f5dd0` is an ancestor of `origin/main`; `gh pr view 20` confirmed state MERGED, merge commit `f7a0ca61873398a1ff9e5a93e481acec9374367e`, merged 2026-08-16T05:37:08Z. The current merged source contains the conversion procedure at `plugins/kanmer/skills/kanmer-groom/SKILL.md:77`.

Fresh MCP derived-group reconciliation matched the direct source labels for every phase:

| Phase | Direct label | Derived epic | Result |
|---|---:|---:|---|
| 0 | 4/4 | 4/4 | PASS |
| 1 | 3/3 | 3/3 | PASS |
| 2 | 8/8 | 8/8 | PASS |
| 3 | 3/3 | 3/3 | PASS |
| 4 | 8/8 | 8/8 | PASS |
| 5 | 4/4 | 4/4 | PASS |
| 6 | 4/4 | 4/4 | PASS |
| 7 | 3/3 | 3/3 | PASS |

The two source-count dimensions are total active tickets and done active tickets; each matched the live derived epic progress. An initial probe incorrectly included archived tickets and saw Phase 5 as 5 versus EPIC-006's 4; the exact mismatch was GUI-015, archived with its group membership intact. Re-running with archived tickets excluded (the same active-member semantics used by derived progress) produced the PASS table above. The historical idempotence evidence remains in this proof: the third conversion run created zero groups, patched zero tickets, and found 40 existing members. Current HZN-001/HZN-002 membership drift is intentionally static-horizon behavior and is not claimed as an always-current open-only filter.

Checks:

- `npm run verify:skills` — exit 0; all 14 sections PASS.
- `node --test scripts/verify-skill-prose.test.mjs` — exit 0; 5/5 PASS.
- `git diff --check` in the clean merged-main verification worktree — exit 0.

Manual GUI group rendering/screenshot evidence is **INCONCLUSIVE**: no GUI launch or screenshot was available during this verification. The underlying group/member/progress numbers are verified through MCP; visual pixels are not claimed.

## Closeout finalisation — 2026-08-22

PR [#20](https://github.com/collisionengineers/kanmer/pull/20) is MERGED (2026-08-16T05:37:08Z) at merge commit `f7a0ca61873398a1ff9e5a93e481acec9374367e`. The visual group-rendering/screenshot gap remains explicitly INCONCLUSIVE; no pixel evidence is claimed.
