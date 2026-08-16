## Four-profile move matrix — measured, before and after ADR-0013

Harness: `packages/core/src/profile-matrix.test.ts`, run with `PRINT_MATRIX=1`.
Every forward multi-stage move, all four shipped profiles, **every document
present** — so the only thing that can refuse a move is `collapsesPipeline`.
Same harness both times; only the source under it changed.

### BEFORE (at `origin/main`, efdc9f3)

```
move                         feature  fix      chore    spike
backlog -> preparing         ALLOWED  ALLOWED  ALLOWED  ALLOWED
backlog -> implementing      REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> review            REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> verifying         REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> done              REFUSED  REFUSED  REFUSED  ALLOWED
preparing -> implementing    ALLOWED  ALLOWED  ALLOWED  ALLOWED
preparing -> review          REFUSED  ALLOWED  ALLOWED  ALLOWED
preparing -> verifying       REFUSED  ALLOWED  ALLOWED  ALLOWED
preparing -> done            REFUSED  REFUSED  REFUSED  ALLOWED
implementing -> review       ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> verifying    ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> done         REFUSED  ALLOWED  ALLOWED  ALLOWED
review -> verifying          ALLOWED  ALLOWED  ALLOWED  ALLOWED
review -> done               ALLOWED  ALLOWED  ALLOWED  ALLOWED
verifying -> done            ALLOWED  ALLOWED  ALLOWED  ALLOWED
```

### AFTER

```
move                         feature  fix      chore    spike
backlog -> preparing         ALLOWED  ALLOWED  ALLOWED  ALLOWED
backlog -> implementing      REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> review            REFUSED  REFUSED* ALLOWED  ALLOWED
backlog -> verifying         REFUSED  REFUSED* ALLOWED  ALLOWED
backlog -> done              REFUSED  REFUSED  REFUSED  ALLOWED
preparing -> implementing    ALLOWED  ALLOWED  ALLOWED  ALLOWED
preparing -> review          REFUSED  REFUSED* ALLOWED  ALLOWED
preparing -> verifying       REFUSED  REFUSED* ALLOWED  ALLOWED
preparing -> done            REFUSED  REFUSED  REFUSED  ALLOWED
implementing -> review       ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> verifying    ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> done         REFUSED  REFUSED* ALLOWED  ALLOWED
review -> verifying          ALLOWED  ALLOWED  ALLOWED  ALLOWED
review -> done               ALLOWED  ALLOWED  ALLOWED  ALLOWED
verifying -> done            ALLOWED  ALLOWED  ALLOWED  ALLOWED
```

`*` = the five changed cells. **Every one is in the `fix` column.** `feature`,
`chore` and `spike` are byte-identical before and after, which is what the
operator's "keep" means, measured rather than asserted.

The intended cell — `fix implementing → done` — flipped. The other four are the
same mechanism seen from further back: any `fix` move that skips over Review now
crosses two gated boundaries instead of one. Both FRD-002 acceptance cases
survive: `spike backlog → done` and `chore backlog → implementing` are still
ALLOWED.

Still ALLOWED for `fix`, and worth naming because it is what keeps the profile
usable: `implementing → review`, `review → verifying`, `review → done`,
`verifying → done`, `backlog → implementing`. A `fix` walked one stage at a time
is unaffected end to end.

`fix` and `feature` now agree on every row except `backlog → implementing`,
where `feature`'s `leave-backlog` governing-doc gate still separates them.
