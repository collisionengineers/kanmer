---
id: CORE-095
type: ticket
title: Stabilize core Vitest isolation on protected Windows runners
status: verifying
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-24T14:39:54.327Z'
  review: '2026-08-24T14:50:28.320Z'
  verifying: '2026-08-24T14:57:09.332Z'
taken_at: '2026-08-24T14:45:04.026Z'
branch: core-095-vitest-file-isolation
worktree: .worktrees/core-095
labels:
  - windows
  - ci
  - tests
  - flaky
groups:
  - HZN-007
links:
  - CORE-035
  - CORE-022
refs:
  - docs/functional/frd/FRD-006-typed-proof.md
commits:
  - f7942ec647c44753b8901dcbebf2755a6e041c1f
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/238'
archived: false
created: '2026-08-24T14:39:17.215Z'
updated: '2026-08-24T14:57:09.332Z'
---

## What

A public protected Windows Actions run of current `origin/main` passed 307 core tests but timed out at the fixed 5-second limit in three unrelated filesystem-heavy tests: stale exclusive-lock recovery, profile-gate resolution, and area-based ticket ID placement. The same authoritative `npm run verify` run therefore failed.

## Scope

Reproduce the Windows runner behavior and make core test execution deterministic without weakening assertions, removing timeout coverage, or globally hiding slowness. Preserve bounded lock semantics and the existing profile/ID behavior. Keep [[CORE-035]] as the integration verifier; do not change its protected fixture rules.

## Verification

- [ ] The three named cases pass on a clean Windows GitHub Actions run alongside the core suite.
- [ ] `npm run verify` passes on the protected fixture at a reviewed exact head.
- [ ] Any timeout adjustment is test-specific, justified, and retains a finite failure bound.

## Outcome
