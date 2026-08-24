---
id: CORE-100
type: ticket
title: Correct release asset-name verification for Electron Builder output
status: review
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-24T22:43:11.335Z'
  review: '2026-08-24T23:11:16.705Z'
taken_at: '2026-08-24T22:51:49.961Z'
branch: core-100-deterministic-windows-assets
worktree: .worktrees/core-100
labels:
  - release
  - assets
  - regression
groups:
  - HZN-007
links:
  - CORE-099
  - GUI-131
blocks:
  - CORE-099
refs:
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 7e0683be876ff1e3921a999fc3d6f0257d937e43
  - fb501a0487dc4314e432054c7ef01336b5d67f25
prs:
  - '251'
archived: false
created: '2026-08-24T22:43:05.670Z'
updated: '2026-08-24T23:11:16.705Z'
---

## What

Diagnose and correct the source-owned mismatch between the release asset verifier's expected installer naming and the actual Electron Builder upload naming, with a regression test against the v0.3.6 evidence.

## Triggering evidence

The one authorized [[CORE-099]] publisher invocation for v0.3.6 completed its shared verification rail and GUI build, pushed immutable tag `v0.3.6`, and created a public release, then exited 1. The verifier expected `Kanmer-Setup-0.3.6.exe`, while the upload was named `Kanmer.Setup.0.3.6.exe`; both dot-form installer and blockmap are present, alongside duplicate/mixed-form artifacts. The prior immutable v0.3.4/v0.3.5 failed-publication records remain unchanged.

## Scope

- Research actual Electron Builder local artifact and GitHub upload names versus the validator/repair derivation.
- Change only the source/test/documentation necessary to make the verifier recognize the correct, complete artifact set without weakening presence, state, size, digest, or manifest checks.
- Preserve exact v0.3.6 evidence; do not manually alter its tag, release, assets, workflow, or publication state.
- A future successor release needs its own ticket and normal review after this fix is proven. This ticket must not publish, retag, upload, or repair a release.

## Verification

Provide a regression test covering the exact expected/actual-name boundary and record whether an existing published v0.3.6 release verifies read-only after the source fix. No release is claimed or retried here.

## Outcome
