# Proof

Branch at `fcddf2d`.

- Six channels typed end to end: `listGroups`, `getGroup`, `createGroup`,
  `updateGroup`, `getGroupDoc`, `setGroupDoc`.
- The view renders goal, kind, archived state, the progress bar, per-stage
  counts, editable context and the member table; member ids open the ticket.
- Archived members render greyed and are excluded from the totals - the same
  rule `deriveMembers` applies, asserted in core's tests and over stdio in
  `smoke.mjs`.
- Both typechecks, GUI build, 124 GUI tests, boot smoke exit 0.

**Not proven here:** the view against a group with real members on this repo's
board - no groups exist here yet. They arrive with SKILL-007, which converts the
`v3-phase-N` labels into epics; that will be the first real data this view sees.
