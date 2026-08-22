---
id: CORE-074
type: ticket
title: 'CORE-071 review: make ignore reconciliation atomic across the write race'
status: implementing
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:47:33.460Z'
  implementing: '2026-08-22T15:47:50.988Z'
taken_at: '2026-08-22T15:47:52.691Z'
branch: core-074-atomic-ignore-merge
worktree: .worktrees/core-074
labels:
  - pr-review
  - core-071
  - automated-review
groups:
  - HZN-007
links:
  - CORE-071
blocks:
  - CORE-071
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
archived: false
created: '2026-08-22T15:46:18.818Z'
updated: '2026-08-22T15:47:52.691Z'
---

PR #192 review finding: ensureIgnore performs a second read and then an ordinary writeFile, leaving a TOCTOU window where a concurrent edit between the compare and write is overwritten; post-write verification cannot detect an edit lost before the write. Replace this with a lock/atomic compare-and-swap or other race-safe merge, and add a deterministic regression that exercises the write-window boundary.
