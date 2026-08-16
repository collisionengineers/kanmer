# Checklist

- [ ] `gatedBoundariesCrossed` — boundaries crossed that have ≥1 requirement
- [ ] `moveItem` rejects a move crossing more than one, before any write
- [ ] error names the count, the boundary labels, and the next stage
- [ ] error is distinct from the missing-document error
- [ ] backwards moves unaffected
- [ ] `feature` backlog → done rejected
- [ ] `chore` backlog → implementing still allowed
- [ ] `spike` backlog → done still allowed
- [ ] every single-step move in the feature pipeline still allowed
- [ ] `stageEntered` on the item schema + `KEY_ORDER`
- [ ] stamped on entry, never overwritten
- [ ] survives a frontmatter round-trip
- [ ] FRD-002 G2 amended: the rule, and why R1/R2 as proposed were dropped
- [ ] `plugin:build` + `plugin:check` (core compiles into the bundle)
