---
id: CORE-098
type: ticket
title: Publish and validate the v0.3.5 successor release
status: backlog
area: core
assignee: ''
profile: chore
labels:
  - release
  - verification
  - successor
groups:
  - HZN-007
links:
  - CORE-096
  - CORE-097
blocks:
  - CORE-036
  - CORE-042
refs:
  - docs/functional/frd/FRD-021-auto-update.md
archived: false
created: '2026-08-24T20:33:03.952Z'
updated: '2026-08-24T20:33:03.952Z'
---

## Why

The v0.3.4 tag was pushed during a failed publication attempt and has no GitHub Release or public assets. Its tag must remain immutable. The approved recovery is a separately traceable v0.3.5 successor release.

## Scope

- Prepare v0.3.5 from current protected `main` only after its release-notes ticket merges.
- Obtain a normal independent review and protected-branch merge for the generated release PR.
- Run the repository release publisher from clean merged `main`, using the existing authenticated GitHub CLI session only in that local publisher process.
- Verify the v0.3.5 tag, GitHub Release, expected assets and updater/release workflow evidence.
- Add narrowly scoped evidence links to [[CORE-036]] and [[CORE-042]] without promoting either ticket until its own criteria pass.

## Constraints

- Do not alter, force-move, or re-create the v0.3.4 tag.
- Do not manually upload or repair assets.
- Do not use administrative merge bypasses.
- Treat v0.3.4's incomplete publication as historical failed evidence in [[CORE-096]].

## Verification

Record the release-script output, published asset verification, tag-workflow result, and any explicit downstream-ticket evidence. The Outcome section is completed only at closeout.

## Outcome
