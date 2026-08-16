# Proof

Branch `v3-phase-minus-1-prework` at `cb39080`. The FRD-002 acceptance list,
asserted twice — in core, and again over real stdio in `smoke.mjs`, because a
gate that works in core but not through the tool surface is a gate agents do not
have.

| FRD-002 | Assertion |
|---|---|
| 1 | chore: Backlog → Implementing in one call on `plan/` alone; held at Done without proof |
| 2 | spike: Backlog → Done on `research/` alone |
| 3 | feature: cannot leave Backlog without a governing doc |
| 4 | custom `research/auth` not satisfied by `research/db.md` |
| 5 | feature → chore immediately unblocks the previously blocked move |
| G2 | a Backlog → Done jump is refused by *leaving Backlog*, the first unmet boundary |
| G3 | creation into every one of the six stages succeeds |
| P6 | area `defaultProfile` inherited; an explicit ticket profile wins |
