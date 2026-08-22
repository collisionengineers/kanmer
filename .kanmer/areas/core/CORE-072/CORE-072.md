---
id: CORE-072
type: ticket
title: 'CORE-058 review: resume orphan migration after retry'
status: verifying
area: core
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-22T15:45:16.135Z'
  implementing: '2026-08-22T15:59:39.538Z'
  review: '2026-08-22T16:03:57.101Z'
  verifying: '2026-08-22T16:25:37.312Z'
taken_at: '2026-08-22T15:59:40.487Z'
branch: core-072-resume-orphan-migration
worktree: .worktrees/core-072
labels:
  - pr-review
  - core-058
  - automated-review
groups:
  - HZN-007
links:
  - CORE-058
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - 9abfc9f47b8acfa31ef57d5b30071f72de43497c
  - ceaab8d455fd198a3421fa73bbf361ec33df0bd0
  - d4dee4bb668d27a1942532d940eb6d4508a224ab
  - 271790e58c52a14fa4b3cec62f7146b6a67bcdcd
prs:
  - '194'
  - '196'
archived: false
created: '2026-08-22T15:15:55.500Z'
updated: '2026-08-22T16:25:37.312Z'
---

PR #180 thread 3836323268: when orphan creation copied the source board and ignore repair failed, a later retry must complete the source-board cleanup/migration rather than only repairing .gitignore; add regression under FRD-020 R2.
