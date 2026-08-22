---
id: CORE-089
type: ticket
title: >-
  Rebase CORE-026 cumulative branch, restore GUI group-menu files, and clear
  hosted verification
status: verifying
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T21:34:43.313Z'
  review: '2026-08-22T21:38:36.382Z'
  verifying: '2026-08-22T21:41:28.018Z'
labels:
  - remediation
  - integration
  - verification
groups:
  - HZN-007
links:
  - CORE-026
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - dcfe49b5af7d5dad026a8ced4380039df2d7a3cc
  - f2e694a4f9ce689c0949814ea88c2910ddb93f37
prs:
  - '216'
archived: false
created: '2026-08-22T21:33:17.375Z'
updated: '2026-08-22T21:41:29.584Z'
---

Resolve fresh CORE-026 review findings F-010 and F-011: rebase the cumulative parent onto current main so merged GUI-109 group-menu files are retained, then rerun the authoritative hosted verification after the source remediation chain is merged. Preserve the prior failed run as evidence and record a fresh exact-head independent attestation. This ticket blocks [[CORE-026]].
