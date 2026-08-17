# Files — SKILL-019

## Where the change lands

| Path | Why |
|---|---|
| apps/gui/src/main/providers.ts | Change OpenCode copySkills destination to .opencode/skills and correct the provider comment. |
| apps/gui/src/main/providers.test.ts | Replace the shared OpenCode/Antigravity assertion with distinct canonical destinations. |
| apps/gui/src/main/connect.test.ts | Prove OpenCode disconnect removes .opencode/skills without touching Antigravity’s .agents/skills. |
| packages/core/src/staleness.ts | Add .opencode/skills to canonical copied-skill destinations while retaining .agents/skills for Antigravity. |
| packages/core/src/staleness.test.ts | Prove drift is detected in .opencode/skills and unrelated/Antigravity .agents behavior remains valid. |
| .gitignore | Add the generated .opencode/skills directory and correct the destination comment. |
| docs/functional/frd/FRD-012-connect.md | Change the OpenCode skill-install bullet, shared-directory ownership language, and acceptance criterion; explicitly retain Antigravity at .agents. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Correct the convergence note and consequences so only Antigravity owns .agents while OpenCode uses its native path. |
| AGENTS.md | Update any provider-install statements that still describe OpenCode sharing .agents. |

## Context files

| Path | What it tells the implementer |
|---|---|
| apps/gui/src/main/connect.ts | Peer retention already compares exact skillsDir values, so destination separation should work without production changes. |
| docs/functional/frd/FRD-023-agent-skills-system.md | Delegates install placement to FRD-012 and keeps the roster/rail unchanged. |
| https://opencode.ai/docs/skills/ | Officially defines .opencode/skills and discovery to the git worktree. |
| https://antigravity.google/docs/skills/ | Confirms Antigravity remains on .agents/skills in this ticket. |

## Ripple effects

Generated-directory ownership, disconnect messaging, staleness reporting, gitignore coverage, and documentation change. Existing legacy OpenCode copies under .agents are not automatically removed because that tree may belong to Antigravity.

## Out of scope

Antigravity installation, Codex suppression/plugin behavior, global plugins, legacy .agents cleanup, MCP registration formats, Grok, Claude, and skill content are unchanged.
