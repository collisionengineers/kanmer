---
id: CORE-088
type: ticket
title: >-
  Harden source cache refresh, DNS resolution, and orphan cleanup after CORE-026
  review
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - remediation
  - sources
  - security
groups:
  - HZN-007
links:
  - CORE-026
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T21:33:17.326Z'
updated: '2026-08-22T21:33:17.326Z'
---

Resolve the fresh independent CORE-026 review findings F-006 through F-009: cache directory symlink refusal and empty/no-root representation validation; preserve stale fallback failures and forced refresh after active rejection; bound cache reads and validate cached document origins; persist replacement validators from 304; handle Node lookup all:true callback shape with identity-family controls; make orphan source cleanup a locked fingerprint-and-delete transaction. Add deterministic regressions and update the cumulative CORE-026 packet. This ticket blocks [[CORE-026]].
