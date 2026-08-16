# Proof

Branch `v3-phase-minus-1-prework` at `cb39080`. Six regression tests plus a real
migration.

| Case | Result |
|---|---|
| Clean v2 board (7 stages, priorities, loose docs, scratch) | 7→6, zero `needs-restage`, docs relocated, `impact.md` → `files/impact.md` |
| Board with a `triage` stage | ticket parked in Backlog, labelled, listed by id in the report |
| Dry run vs apply | identical `stageMapping`; the dry run leaves the board at format 2 |
| Second run | `alreadyV3`, empty report, ticket file **byte-identical** |
| Resume after a partial run | finishes the remaining moves, no duplication |
| Workable afterwards | a migrated `feature` ticket in Preparing is held for `plan, checklist`, then moves once written |

**The real one.** This repo's own board, 40 tickets:

    done         -> done          5
    backlog      -> backlog      34
    researching  -> preparing     1
    needs-restage 0 · blockers 0 · priorities stripped 40
    profiles: 35 feature, 5 custom · 10 documents relocated

The applied result matched the dry-run report exactly, which is Phase 7.1's
stated criterion. GUI-004 then crossed a gate on the migrated board the same
day, as `spike`, Backlog → Done on research alone.
