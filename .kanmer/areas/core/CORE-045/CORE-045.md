---
id: CORE-045
type: ticket
title: >-
  CORE-044 review remediation: stale-lock recovery and complete DNS destination
  policy
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T10:11:15.070Z'
labels:
  - pr-review
  - security
  - concurrency
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
created: '2026-08-22T10:11:05.566Z'
updated: '2026-08-22T10:11:15.070Z'
---

Independent review of CORE-044 / PR #165 found two blockers that must be fixed and re-reviewed before CORE-044 can merge:

- F-003: withExclusiveFileLock leaves a crash-created lock indefinitely; bounded retries surface EEXIST but no bounded stale-lock recovery exists. Add a fail-closed, bounded stale-lock policy with deterministic tests, or explicitly change the contract and disposition it with evidence.
- F-009: DNS destination policy misses otherwise non-global IPv4/IPv6 ranges and mapped equivalents. Complete the public-destination classifier and deterministic tests; do not weaken SSRF coverage.

Keep the fix stacked on CORE-044 head 33f32e3aae9819f1c2344863272dacb5c958fbac. No unrelated source/editor/provider work. CORE-044 remains blocked until this ticket is independently reviewed and dispositioned.
