---
id: SKILL-019
type: ticket
title: Move OpenCode Kanmer skills to .opencode/skills
status: verifying
area: skills
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-17T02:16:05.204Z'
  review: '2026-08-17T04:46:06.610Z'
  verifying: '2026-08-17T04:47:15.520Z'
taken_at: '2026-08-17T04:42:22.215Z'
branch: skill-019-opencode-skills-dir
worktree: .worktrees/skill-019
labels:
  - opencode
  - skills
  - install
  - provider-isolation
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-012-connect.md
commits:
  - 3e0a530
  - cc0974c
prs:
  - '63'
archived: false
created: '2026-08-17T02:15:59.805Z'
updated: '2026-08-17T04:47:15.520Z'
---

## Problem

Kanmer Connect copies OpenCode’s skill roster into `.agents/skills`, a cross-agent directory also discovered by Codex and required by Antigravity. When Codex also has the Kanmer plugin, OpenCode’s copy contributes a duplicate unqualified Kanmer skillset.

## Desired outcome

OpenCode receives Kanmer skills from its native project directory, `.opencode/skills`, while its existing `opencode.json` MCP registration remains unchanged.

Antigravity remains on `.agents/skills` for now. The remaining Codex/Antigravity duplicate is explicitly deferred and this ticket does not claim to solve it.

## Verification

Connecting OpenCode writes the complete stamped Kanmer roster to `.opencode/skills`, staleness recognizes that destination, disconnect removes only OpenCode’s owned copy, and Antigravity’s `.agents/skills` content is untouched.

## Outcome
