---
id: CORE-088
type: ticket
title: >-
  Harden source cache refresh, DNS resolution, and orphan cleanup after CORE-026
  review
status: done
area: core
assignee: core041_executor
profile: fix
stageEntered:
  preparing: '2026-08-22T21:38:45.507Z'
  review: '2026-08-22T22:08:20.428Z'
  verifying: '2026-08-22T22:22:05.257Z'
  done: '2026-08-23T00:42:49.530Z'
labels:
  - remediation
  - sources
  - security
groups:
  - HZN-007
links:
  - CORE-026
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 8d62176216d8c886779217fd846149f0b04b1655
  - 973bcf9340aa2c627c717a00f1bcf0f6d3fca242
prs:
  - '218'
archived: false
created: '2026-08-22T21:33:17.326Z'
updated: '2026-08-23T00:42:49.743Z'
---

Resolve the fresh independent CORE-026 review findings F-006 through F-009: cache directory symlink refusal and empty/no-root representation validation; preserve stale fallback failures and forced refresh after active rejection; bound cache reads and validate cached document origins; persist replacement validators from 304; handle Node lookup all:true callback shape with identity-family controls; make orphan source cleanup a locked fingerprint-and-delete transaction. Add deterministic regressions and update the cumulative CORE-026 packet. This ticket blocks [[CORE-026]].
