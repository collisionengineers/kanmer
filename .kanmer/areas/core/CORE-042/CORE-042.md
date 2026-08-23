---
id: CORE-042
type: ticket
title: Adapt release workflow for protected main
status: verifying
area: core
assignee: core-042-take
profile: fix
stageEntered:
  preparing: '2026-08-22T07:33:39.438Z'
  review: '2026-08-22T07:48:14.801Z'
  verifying: '2026-08-22T08:09:04.661Z'
  done: '2026-08-22T08:09:17.457Z'
labels:
  - follow-up
  - release
  - branch-protection
groups:
  - EPIC-009
  - HZN-007
links:
  - CORE-033
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - aa6f9ddefe05aaa208fe2e00b06da019aaccb6d6
  - 2b13ad6590610d76a885f047acfe38a74ce29082
  - 20f31b5abf0a463f76c14fc002549fc6dcc21dc6
  - 9ab4af5a7341f0e16ff3748880e4f2c16f58292e
  - e141dca74bec48e7e8068b767f6db9e7a5c41322
prs:
  - '160'
archived: false
created: '2026-08-22T06:48:09.492Z'
updated: '2026-08-23T00:50:04.743Z'
---

Deferred from CORE-033 review finding: scripts/release.mjs currently mutates and pushes main directly, which the new protected-main PR/verify boundary rejects. Design and implement the authorized release path so version bump/release commit reaches main through a compliant PR/check boundary while preserving tag publication and reachable release commits. No bypass push; retain dry-run and hosted release/update proof. Link [[CORE-033]].

## Outcome

Implemented the protected-main two-phase release flow in PR #160. Merge commit: e141dca74bec48e7e8068b767f6db9e7a5c41322. Preparation now creates release/v<version> with a dynamic Kanmer ticket footer; publication requires the full post-merge SHA and publisher token. Hosted checks and merged-main verification PASS; public tag/assets, release visibility, and a real two-version updater cycle remain INCONCLUSIVE (see proof).
