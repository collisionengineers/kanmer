---
id: CORE-074
type: ticket
title: 'CORE-071 review: make ignore reconciliation atomic across the write race'
status: done
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:47:33.460Z'
  implementing: '2026-08-22T15:47:50.988Z'
  review: '2026-08-22T15:53:08.008Z'
  verifying: '2026-08-22T15:55:52.294Z'
  done: '2026-08-23T00:03:55.533Z'
labels:
  - pr-review
  - core-071
  - automated-review
groups:
  - HZN-007
links:
  - CORE-071
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 59e7e0fe
  - c8ee9a4e
prs:
  - '193'
archived: false
created: '2026-08-22T15:46:18.818Z'
updated: '2026-08-23T00:08:43.920Z'
---

PR #192 review finding: ensureIgnore performs a second read and then an ordinary writeFile, leaving a TOCTOU window where a concurrent edit between the compare and write is overwritten; post-write verification cannot detect an edit lost before the write. Replace this with a lock/atomic compare-and-swap or other race-safe merge, and add a deterministic regression that exercises the write-window boundary.

## Outcome

Verified on merged origin/main at fdaededcf8bff0c5d5867e386782d8bdc32324e9; PR #193 merged at c8ee9a4e96c5e9d0268e21c59247db00ed958b0b; deterministic proof is recorded. External Windows/hosted/packaged/visual boundaries remain INCONCLUSIVE.
