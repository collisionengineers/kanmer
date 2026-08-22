---
id: CORE-045
type: ticket
title: >-
  CORE-044 review remediation: stale-lock recovery and complete DNS destination
  policy
status: done
area: core
assignee: codex-core045-execute
profile: fix
stageEntered:
  preparing: '2026-08-22T10:11:15.070Z'
  review: '2026-08-22T10:23:07.802Z'
  verifying: '2026-08-22T12:55:35.170Z'
  done: '2026-08-22T17:26:27.033Z'
taken_at: '2026-08-22T10:13:53.002Z'
branch: core-045-lock-dns-remediation
worktree: .worktrees/core-045
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-044
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
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
  - '166'
  - '167'
  - '169'
  - '171'
  - '172'
  - '173'
  - '174'
archived: false
created: '2026-08-22T10:11:05.566Z'
updated: '2026-08-22T17:26:39.566Z'
---

Independent review of CORE-044 / PR #165 found two blockers that must be fixed and re-reviewed before CORE-044 can merge:

- F-003: withExclusiveFileLock leaves a crash-created lock indefinitely; bounded retries surface EEXIST but no bounded stale-lock recovery exists. Add a fail-closed, bounded stale-lock policy with deterministic tests, or explicitly change the contract and disposition it with evidence.
- F-009: DNS destination policy misses otherwise non-global IPv4/IPv6 ranges and mapped equivalents. Complete the public-destination classifier and deterministic tests; do not weaken SSRF coverage.

Keep the fix stacked on CORE-044 head 33f32e3aae9819f1c2344863272dacb5c958fbac. No unrelated source/editor/provider work. CORE-044 remains blocked until this ticket is independently reviewed and dispositioned.
