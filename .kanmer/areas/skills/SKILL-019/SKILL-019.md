---
id: SKILL-019
type: ticket
title: Move OpenCode Kanmer skills to .opencode/skills
status: done
area: skills
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-17T02:16:05.204Z'
  review: '2026-08-17T04:46:06.610Z'
  verifying: '2026-08-17T04:47:15.520Z'
  done: '2026-08-17T04:48:43.629Z'
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
  - db7ed679368a222d59f5b589d35b246468f51cf4
prs:
  - '63'
archived: false
created: '2026-08-17T02:15:59.805Z'
updated: '2026-08-17T04:49:41.827Z'
---

## Problem

Kanmer Connect copies OpenCode’s skill roster into `.agents/skills`, a cross-agent directory also discovered by Codex and required by Antigravity. When Codex also has the Kanmer plugin, OpenCode’s copy contributes a duplicate unqualified Kanmer skillset.

## Desired outcome

OpenCode receives Kanmer skills from its native project directory, `.opencode/skills`, while its existing `opencode.json` MCP registration remains unchanged.

Antigravity remains on `.agents/skills` for now. The remaining Codex/Antigravity duplicate is explicitly deferred and this ticket does not claim to solve it.

## Verification

Connecting OpenCode writes the complete stamped Kanmer roster to `.opencode/skills`, staleness recognizes that destination, disconnect removes only OpenCode’s owned copy, and Antigravity’s `.agents/skills` content is untouched.

## Outcome

Shipped and merged in PR #63: https://github.com/collisionengineers/kanmer/pull/63

OpenCode now uses `.opencode/skills`; Antigravity remains on `.agents/skills`. Review corrected an overclaim so the governing docs explicitly retain the deferred Codex/Antigravity duplicate. No follow-up ticket was created because the user deferred that broader issue pending a viable workaround.
