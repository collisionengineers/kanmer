---
id: CORE-058
type: ticket
title: >-
  CORE-044 review remediation: reconcile board cache ignore and plugin artifact
  provenance
status: review
area: core
assignee: codex-core058-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T13:21:11.027Z'
  implementing: '2026-08-22T13:24:34.315Z'
  review: '2026-08-22T13:33:52.602Z'
taken_at: '2026-08-22T13:24:57.195Z'
branch: core-058-board-ignore-plugin-artifact
worktree: .worktrees/core-058
labels:
  - pr-review
  - board-sync
  - artifact
groups:
  - HZN-007
links:
  - CORE-044
blocks:
  - CORE-044
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 08f0393aaa8836dad82fba433f8b4c0ecf49e553
prs:
  - '180'
archived: false
created: '2026-08-22T13:03:07.157Z'
updated: '2026-08-22T13:33:52.602Z'
---

Close CORE-044 review findings for release and board hygiene: add the sources cache rule to canonical board-worktree ignore creation and reconciliation, and rebuild the committed plugin artifact from a normal checkout so plugin:check is reproducible outside nested ticket worktrees. Add regression/evidence for existing and new board worktrees and exact artifact parity. Link [[CORE-044]].
