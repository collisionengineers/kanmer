---
id: CORE-044
type: ticket
title: >-
  CORE-026 review remediation: harden source fetch, cache atomicity, and
  concurrency
status: review
area: core
assignee: codex-core044-execute
profile: fix
stageEntered:
  preparing: '2026-08-22T09:30:46.122Z'
  review: '2026-08-22T10:05:03.751Z'
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
blocks:
  - CORE-026
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 33f32e3aae9819f1c2344863272dacb5c958fbac
  - 1234264b292e574d38f276b91592ea0b8bef9361
  - 0f7ccc4efad0aeae2295f3ba08e0b6e886356679
  - 8edfede9bdb663171601cb326a67bd03792065e2
  - fc8e591e344cb7743204f8261eb5186b76f1d3aa
  - 31e572dc54b311164444cd5ee1a6cba225d618f2
  - 311c6eef4d6b5c1e6acea1b7e6d779660f792cea
  - 0f9af92ba7bf332a3fffbc49b3273bd71b59c49a
  - 5cd42532b1ff9514655a5713d69a6507921d1b5f
  - 6f206ae3ae4ef3d7d6bae5106081b1d233e864fb
  - 67a066d351e3f7924f87f7580a74c98e7b94cbb2
  - 695e12ee659b927513c7e0190a81d5ecb9e8c513
  - 36b57a93b6b22f10672d571fb68c160d4766cfc5
  - 02389045b7d26ad46e470af1d96a3084b486bf68
  - 142af2f3b105b38b00d659019d1cfe99f3b50844
prs:
  - '165'
  - '166'
  - '167'
  - '169'
  - '171'
  - '172'
  - '173'
  - '174'
archived: false
created: '2026-08-22T09:23:34.607Z'
updated: '2026-08-22T12:56:49.917Z'
---

Review follow-up for CORE-026 / PR #163. Independent automated review identified unresolved in-scope correctness and security gaps that must be fixed before CORE-026 can merge: validate every redirect hop before issuing the next request; reject private/loopback/link-local destinations for remote HTTP exposure or keep fetch_source local-only; reject or safely redact query-bearing credential URLs; use atomic core-backed cache writes with cross-process safety; preserve board edits with a content/version CAS or retry; register the source test suite in the authoritative rail; and reconcile any remaining selector, URL canonicalization, content-type, redirect-relative-link, fragment/image parsing, 304 freshness, schema reuse, and unavailable-source skill gaps against FRD-027/ADR-0020. Keep GUI source editing either implemented or explicitly reconciled with the governing acceptance contract. This ticket blocks CORE-026 until each finding is fixed or explicitly rejected with evidence and re-reviewed.
