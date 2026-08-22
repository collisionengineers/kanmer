---
id: CORE-044
type: ticket
title: >-
  CORE-026 review remediation: harden source fetch, cache atomicity, and
  concurrency
status: verifying
area: core
assignee: codex-core044-execute
profile: fix
stageEntered:
  preparing: '2026-08-22T09:30:46.122Z'
  review: '2026-08-22T10:05:03.751Z'
  verifying: '2026-08-22T16:52:18.254Z'
taken_at: '2026-08-22T09:35:47.004Z'
branch: core-044-source-fetch-remediation
worktree: .worktrees/core-044
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-026
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 33f32e3a
  - 1234264b
  - 0f7ccc4e
  - 8edfede9
  - fc8e591e
  - 31e572dc
  - 311c6eef
  - 0f9af92b
  - 5cd42532
  - 6f206ae3
  - 67a066d3
  - 695e12ee
  - 36b57a93
  - 02389045
  - 142af2f3
  - '69860063'
  - 3c070662
  - 5f63571e
  - c53c1d13
  - 7403a7cf
  - 5053af23b87fe591015b14042b920c4cf41259b4
  - e794cbf742f6103cee015d11ef51b867915445a1
prs:
  - '165'
  - '166'
  - '167'
  - '169'
  - '171'
  - '172'
  - '173'
  - '174'
  - '179'
  - '178'
  - '180'
archived: false
created: '2026-08-22T09:23:34.607Z'
updated: '2026-08-22T16:52:18.254Z'
---

Review follow-up for CORE-026 / PR #163. Independent automated review identified unresolved in-scope correctness and security gaps that must be fixed before CORE-026 can merge: validate every redirect hop before issuing the next request; reject private/loopback/link-local destinations for remote HTTP exposure or keep fetch_source local-only; reject or safely redact query-bearing credential URLs; use atomic core-backed cache writes with cross-process safety; preserve board edits with a content/version CAS or retry; register the source test suite in the authoritative rail; and reconcile any remaining selector, URL canonicalization, content-type, redirect-relative-link, fragment/image parsing, 304 freshness, schema reuse, and unavailable-source skill gaps against FRD-027/ADR-0020. Keep GUI source editing either implemented or explicitly reconciled with the governing acceptance contract. This ticket blocks CORE-026 until each finding is fixed or explicitly rejected with evidence and re-reviewed.
