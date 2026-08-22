---
id: CORE-046
type: ticket
title: >-
  CORE-045 review remediation: close stale-lock reclaim race and IPv6 special
  ranges
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-22T10:35:04.386Z'
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-045
blocks:
  - CORE-045
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T10:34:56.849Z'
updated: '2026-08-22T10:35:04.386Z'
---

Independent review of CORE-045 / PR #166 found two blockers that must be fixed and independently re-reviewed before CORE-045 can merge:\n\n- F-003: stale-lock reclaim has a TOCTOU race that can delete another reclaimer's newly claimed lock. Require atomic quarantine/rename of the exact stale inode, with a deterministic concurrent-reclaimer test; never unlink the original path after another claimant can recreate it.\n- F-009: IPv6 classification still permits non-global ranges 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16. Add fail-closed classification/tests while preserving mapped and other special-use handling.\n\nStack on CORE-045 head 1234264b292e574d38f276b91592ea0b8bef9361. CORE-045 remains blocked until this ticket is fixed, independently reviewed, and dispositioned. No unrelated source/editor/provider work.
