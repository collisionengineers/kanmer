---
id: CORE-101
type: ticket
title: Publish and validate the v0.3.7 successor release
status: review
area: core
assignee: codex-core-101
profile: chore
stageEntered:
  preparing: '2026-08-24T23:29:48.670Z'
  review: '2026-08-24T23:54:27.689Z'
taken_at: '2026-08-24T23:45:16.776Z'
branch: core-101-v037-release-hold
worktree: .worktrees/core-101
labels:
  - release
  - verification
  - successor
groups:
  - HZN-007
links:
  - CORE-099
  - CORE-100
blocks:
  - CORE-036
  - CORE-042
refs:
  - docs/functional/frd/FRD-021-auto-update.md
prs:
  - '253'
archived: false
created: '2026-08-24T23:29:36.859Z'
updated: '2026-08-24T23:54:27.689Z'
---

## Why

The immutable v0.3.4 and v0.3.5 failed-publication tags and the public-but-incomplete v0.3.6 release must remain unchanged. [[CORE-100]] is merged, verified, and closed: it makes future Electron Builder Windows artifacts match the updater manifest without weakening strict asset validation. v0.3.7 is the separately traceable successor release.

## Scope

- Prepare v0.3.7 from protected `main` only after its release-notes ticket is Done.
- Obtain independent exact-head review and normal protected-main merge for the generated release PR.
- Run the existing publisher exactly once from a second clean merged-main clone, with canonical board binding and credential limited to that process.
- Verify v0.3.7 tag, public release, assets, latest manifest, and release workflow; append only factual evidence to [[CORE-036]] and [[CORE-042]].

## Constraints

- Never alter, retag, retry, manually upload, edit, repair, or otherwise change v0.3.4, v0.3.5, or v0.3.6.
- The preparation and publisher invocations must bind `KANMER_ROOT` to the canonical board before execution.
- Do not use administrative merge bypasses.
- Do not change release source, CI, credentials, validation strictness, or artifact naming in this orchestration ticket; new defects become separate tickets.

## Verification

Record sanitized release-script output, the exact tag target, GitHub Release and asset verification, latest.yml contract, and terminal tag-workflow result. The Outcome is completed only at closeout.

## Outcome
