---
id: CORE-096
type: ticket
title: 'Prepare, publish, and validate v0.3.4 release'
status: review
area: core
assignee: codex-release-096
profile: chore
stageEntered:
  preparing: '2026-08-24T16:50:52.591Z'
  review: '2026-08-24T18:27:19.603Z'
taken_at: '2026-08-24T16:54:50.921Z'
branch: release/v0.3.4
worktree: .worktrees/core-096
labels:
  - release
  - verification
groups:
  - HZN-007
links: []
blocks:
  - CORE-036
  - CORE-042
commits:
  - 03eb9f49e46a3d6961054d7e1eb880bc01790f30
prs:
  - '244'
archived: false
created: '2026-08-24T16:50:29.723Z'
updated: '2026-08-24T18:27:19.603Z'
---

## What
Prepare the v0.3.4 release through the repository's protected-main release workflow, obtain independent PR review and merge, publish from the merged release commit, and preserve exact tag/workflow/public-asset evidence.

## Why
[[CORE-036]] requires a real next-tag green `release-verify` run. [[CORE-042]] requires the first of two sequential installed-update versions. The release script requires a ticket-bound preparation PR; neither verification ticket may absorb that release scope.

## Verification
- release preparation PR is independently reviewed, merged, and its merge SHA is recorded;
- `npm run release -- 0.3.4 --publish --release-commit <merge-sha>` publishes exactly one tag/release;
- the tag's `release-verify` workflow succeeds;
- `node scripts/verify-release-assets.mjs 0.3.4` succeeds against the published release;
- evidence is appended to CORE-036 and CORE-042 without promoting either until their distinct acceptance criteria pass.

## Outcome
