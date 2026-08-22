---
id: CORE-046
type: ticket
title: >-
  CORE-045 review remediation: close stale-lock reclaim race and IPv6 special
  ranges
status: done
area: core
assignee: codex-core046-execute
profile: fix
stageEntered:
  preparing: '2026-08-22T10:35:04.386Z'
  review: '2026-08-22T10:50:37.878Z'
  verifying: '2026-08-22T12:14:55.959Z'
  done: '2026-08-22T23:50:40.525Z'
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-045
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c
  - 67e2be792e8480d29df7ff13128fb8c7886056a9
  - 0f7ccc4efad0aeae2295f3ba08e0b6e886356679
  - 8edfede9bdb663171601cb326a67bd03792065e2
  - fc8e591e344cb7743204f8261eb5186b76f1d3aa
  - 31e572dc54b311164444cd5ee1a6cba225d618f2
  - 311c6eef4d6b5c1e6acea1b7e6d779660f792cea
prs:
  - '167'
  - '169'
  - '171'
  - '172'
archived: false
created: '2026-08-22T10:34:56.849Z'
updated: '2026-08-22T23:51:31.944Z'
---

Independent review of CORE-045 / PR #166 found blockers that must be fixed and independently re-reviewed before CORE-045 can merge:\n\n- F-003: stale-lock reclaim has a TOCTOU race that can delete another reclaimer's newly claimed lock. Require atomic quarantine/rename of the exact stale inode, with a deterministic concurrent-reclaimer test; never unlink the original path after another claimant can recreate it.\n- F-009: IPv6 classification still permits non-global ranges 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16. Add fail-closed classification/tests while preserving mapped and other special-use handling.\n- F-009 follow-up: the complete non-global destination policy also omits IPv4 192.175.48.0/24; add it and a deterministic redirect/linked-hop lookup invocation regression if the before-every-hop claim is retained.\n\nStack on CORE-045 head 1234264b292e574d38f276b91592ea0b8bef9361. CORE-045 remains blocked until this ticket is fixed, independently reviewed, and dispositioned. No unrelated source/editor/provider work.
