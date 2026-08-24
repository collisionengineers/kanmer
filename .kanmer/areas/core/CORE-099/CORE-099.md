---
id: CORE-099
type: ticket
title: Publish and validate the v0.3.6 successor release
status: review
area: core
order: 20
assignee: codex-root-release-author
profile: chore
stageEntered:
  preparing: '2026-08-24T22:05:45.609Z'
  review: '2026-08-24T22:27:11.240Z'
taken_at: '2026-08-24T22:19:58.156Z'
branch: core-099-v036-release-hold
worktree: .worktrees/core-099
labels:
  - release
  - verification
  - successor
groups:
  - HZN-007
links:
  - CORE-096
  - CORE-098
  - GUI-131
blocks:
  - CORE-036
  - CORE-042
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - d658585848f8c8545b300ecb557a5d23a8c30ed9
prs:
  - '250'
archived: false
created: '2026-08-24T22:04:47.134Z'
updated: '2026-08-24T22:27:11.240Z'
---

## Why

The immutable v0.3.4 and v0.3.5 tags each record a failed local publication attempt and neither has a GitHub Release or public assets. [[GUI-131]] is now merged and verified: publisher mode builds the GUI before any immutable tag can be created. A separately traceable v0.3.6 successor is the safe path to publication.

## Scope

- Prepare v0.3.6 from protected `main` only after its release-notes ticket merges.
- Obtain independent review and a normal protected-branch merge for the generated release PR.
- Run the repository publisher from clean merged `main`, with the existing authenticated GitHub CLI session exposed only to that local publisher process.
- Verify the v0.3.6 tag, GitHub Release, expected assets, release workflow and updater evidence.
- Append only scoped evidence to [[CORE-036]] and [[CORE-042]]; their own acceptance criteria decide their stages.

## Constraints

- Do not alter, force-move, recreate, retry, or manually repair v0.3.4 or v0.3.5.
- Do not manually upload assets or repair a GitHub Release.
- Do not use administrative merge bypasses.
- The preparation and publisher invocations must bind `KANMER_ROOT` to the canonical board before they run.
- GUI-131's pre-tag GUI build remains source scope already merged; this ticket does not change release implementation unless a new, separately ticketed defect is proven.

## Verification

Record the release-script output, public asset verification, tag-workflow result, and any explicit downstream-ticket evidence. The Outcome section is completed only at closeout.

## Outcome
