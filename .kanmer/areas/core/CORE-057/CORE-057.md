---
id: CORE-057
type: ticket
title: 'CORE-044 review remediation: pin DNS validation and bound resolver timeout'
status: implementing
area: core
assignee: codex-core057-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T13:05:54.403Z'
taken_at: '2026-08-22T13:06:05.181Z'
branch: core-057-dns-bound-resolver
worktree: .worktrees/core-057
labels:
  - pr-review
  - sources
  - security
groups:
  - HZN-007
links:
  - CORE-044
blocks:
  - CORE-044
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T13:03:00.897Z'
updated: '2026-08-22T13:06:05.181Z'
---

Close CORE-044 remote-source review findings: ensure the outbound request is bound to the address validated by the public-destination preflight (or implement a governing-document-backed safe equivalent), and enforce the documented fetch deadline across DNS resolution. Add deterministic regression coverage and preserve surfaced errors. Link [[CORE-044]].
