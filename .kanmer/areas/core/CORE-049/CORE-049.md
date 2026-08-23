---
id: CORE-049
type: ticket
title: >-
  CORE-046 review remediation: bounded quarantine rename retry and cumulative
  traceability
status: done
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-22T11:33:25.135Z'
  review: '2026-08-22T11:42:42.505Z'
  verifying: '2026-08-22T12:10:11.762Z'
  done: '2026-08-22T17:27:49.403Z'
taken_at: '2026-08-22T17:31:40.165Z'
branch: core-049-quarantine-rename-retry
worktree: .worktrees/core-049
labels:
  - pr-review
  - security
  - concurrency
groups:
  - HZN-007
links:
  - CORE-046
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 8edfede9bdb663171601cb326a67bd03792065e2
  - fc8e591e344cb7743204f8261eb5186b76f1d3aa
  - 31e572dc54b311164444cd5ee1a6cba225d618f2
prs:
  - '171'
  - '172'
archived: false
created: '2026-08-22T11:33:00.536Z'
updated: '2026-08-23T00:42:33.771Z'
---

Remediate independent CORE-046 review blockers: route stale-lock quarantine renames through the existing bounded Windows retry contract (EPERM/EBUSY/EACCES) with regression coverage; refresh the cumulative post-child report and exact reachable commit metadata; and disposition the fixed original PR thread after evidence is updated. Preserve CORE-047 token/lease behavior, inherited source DNS policy, and explicit live Windows/crash INCONCLUSIVE boundaries. Link [[CORE-046]].\n\n## Outcome\n\nPR #171 merged at `311c6eef4d6b5c1e6acea1b7e6d779660f792cea`; child PR #172 merged at `31e572dc54b311164444cd5ee1a6cba225d618f2`. Verification on the exact cumulative CORE-044 branch passed IO 25/25, source 14/14, core typecheck/build, and diff-check. Broad HTTP remains the inherited 81/82 readiness boundary; hosted/live Windows evidence remains INCONCLUSIVE.


## Closeout outcome

PR #171 (https://github.com/collisionengineers/kanmer/pull/171) merged 2026-08-22T12:10:43Z; child PR #172 (https://github.com/collisionengineers/kanmer/pull/172) merged 2026-08-22T12:07:18Z. Recorded merged-main proof on origin/main a8cc6b01; deterministic evidence and explicit INCONCLUSIVE boundaries are in proof.md.
