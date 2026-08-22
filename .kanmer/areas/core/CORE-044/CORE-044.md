---
id: CORE-044
type: ticket
title: >-
  CORE-026 review remediation: harden source fetch, cache atomicity, and
  concurrency
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T09:30:46.122Z'
labels:
  - pr-review
  - security
  - concurrency
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
created: '2026-08-22T09:23:34.607Z'
updated: '2026-08-22T09:30:46.122Z'
---

Review follow-up for CORE-026 / PR #163. Independent automated review identified unresolved in-scope correctness and security gaps that must be fixed before CORE-026 can merge: validate every redirect hop before issuing the next request; reject private/loopback/link-local destinations for remote HTTP exposure or keep fetch_source local-only; reject or safely redact query-bearing credential URLs; use atomic core-backed cache writes with cross-process safety; preserve board edits with a content/version CAS or retry; register the source test suite in the authoritative rail; and reconcile any remaining selector, URL canonicalization, content-type, redirect-relative-link, fragment/image parsing, 304 freshness, schema reuse, and unavailable-source skill gaps against FRD-027/ADR-0020. Keep GUI source editing either implemented or explicitly reconciled with the governing acceptance contract. This ticket blocks CORE-026 until each finding is fixed or explicitly rejected with evidence and re-reviewed.
