---
id: CORE-089
type: ticket
title: >-
  Rebase CORE-026 cumulative branch, restore GUI group-menu files, and clear
  hosted verification
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - remediation
  - integration
  - verification
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
created: '2026-08-22T21:33:17.375Z'
updated: '2026-08-22T21:33:17.375Z'
---

Resolve fresh CORE-026 review findings F-010 and F-011: rebase the cumulative parent onto current main so merged GUI-109 group-menu files are retained, then rerun the authoritative hosted verification after the source remediation chain is merged. Preserve the prior failed run as evidence and record a fresh exact-head independent attestation. This ticket blocks [[CORE-026]].
