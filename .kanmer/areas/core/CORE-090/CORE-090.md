---
id: CORE-090
type: ticket
title: 'CORE-026 review: refresh MCPB artifact after source-cache hardening'
status: verifying
area: core
assignee: core041_executor
profile: fix
stageEntered:
  implementing: '2026-08-22T22:26:51.954Z'
  review: '2026-08-22T22:30:25.315Z'
  verifying: '2026-08-22T22:59:33.745Z'
taken_at: '2026-08-22T22:27:01.070Z'
branch: core-090-mcpb-refresh
worktree: .worktrees/core-090
labels: []
groups:
  - HZN-007
links:
  - CORE-026
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - a42046176640b575f205f13113b77c4750e23050
  - 75ce9ab11991994bfba46113fe3b79f5cdaaa629
  - cbba69d682c448943cce87c9825589a44f4260d4
prs:
  - '220'
archived: false
created: '2026-08-22T22:26:12.855Z'
updated: '2026-08-22T22:59:43.967Z'
---

Refresh the committed MCPB/plugin artifact after CORE-088 source-cache hardening so the authoritative mcpb:check compares equal on the cumulative CORE-026 branch. Add the generated artifact only; no source behaviour change. This ticket blocks [[CORE-026]].
