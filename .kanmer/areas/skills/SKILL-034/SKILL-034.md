---
id: SKILL-034
type: ticket
title: Ship a runnable kanmer-setup managed-block reconciler
status: implementing
area: skills
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-25T01:50:40.242Z'
taken_at: '2026-08-25T01:51:26.807Z'
branch: skill-034-package-setup-reconciler
worktree: .worktrees/skill-034
labels: []
groups:
  - HZN-007
links:
  - CORE-103
blocks:
  - CORE-103
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
archived: false
created: '2026-08-25T01:27:00.259Z'
updated: '2026-08-25T01:51:26.807Z'
---

The installed v0.3.7 kanmer-setup skill instructs the agent to run `<plugin-root>/../../scripts/agents-block.mjs`, but the installed Codex plugin package contains no such script. Setup can only fall back to hand-editing, while get_status reports the managed AGENTS.md block behind. Package or otherwise expose the single canonical reconciler and prove installed-plugin setup is repeatable.
