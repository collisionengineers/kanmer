---
id: CORE-042
type: ticket
title: Adapt release workflow for protected main
status: backlog
area: core
assignee: ''
profile: fix
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
docs_todo: true
archived: false
created: '2026-08-22T06:48:09.492Z'
updated: '2026-08-22T06:48:20.455Z'
---

Deferred from CORE-033 review finding: scripts/release.mjs currently mutates and pushes main directly, which the new protected-main PR/verify boundary rejects. Design and implement the authorized release path so version bump/release commit reaches main through a compliant PR/check boundary while preserving tag publication and reachable release commits. No bypass push; retain dry-run and hosted release/update proof. Link [[CORE-033]].
