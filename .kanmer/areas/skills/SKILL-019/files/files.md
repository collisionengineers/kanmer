# Files — SKILL-019

## Where the change lands

| Path | Why |
|---|---|
| apps/gui/src/main/providers.ts | Move OpenCode’s copied roster from .agents/skills to its native .opencode/skills; keep Antigravity at its primary .agents/skills path and Codex on the marketplace plugin. |
| apps/gui/src/main/connect.ts | Reconcile provider destinations and manage exact Kanmer-owned Codex skills.config disables alongside the existing MCP config merge/unmerge without disturbing unrelated config entries. |
| apps/gui/src/main/providers.test.ts | Pin the corrected provider matrix and project-config ownership rules. |
| apps/gui/src/main/connect.test.ts | Prove provider connection order, idempotent skills.config merging, selective unmerge, OpenCode destination migration, shared Antigravity ownership, and preservation of user-authored skills/config. |
| packages/core/src/staleness.ts | Treat .opencode/skills, .agents/skills, and .grok/skills as canonical provider destinations and recognize legacy OpenCode ownership without falsely reporting user content. |
| packages/core/src/staleness.test.ts | Cover the revised destination matrix and Codex suppression/config drift. |
| .gitignore | Add .opencode/skills and keep .agents/skills because Antigravity still owns it. |
| docs/functional/frd/FRD-012-connect.md | Correct R2: Antigravity remains .agents; OpenCode uses .opencode; Codex project config suppresses only the Kanmer-owned Antigravity copies while its plugin remains canonical. Requires explicit authorization before implementation. |
| docs/functional/frd/FRD-023-agent-skills-system.md | State the per-host uniqueness invariant through the revised FRD-012 matrix. Requires explicit authorization. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Correct the convergence consequence: the shared standard path is visible to Codex too, so cross-host convergence needs Codex suppression rather than relocation of Antigravity. Requires explicit authorization or a superseding ADR. |
| AGENTS.md | Update provider-install and repo-map prose after governance changes. |

## Context files

| Path | What it tells the implementer |
|---|---|
| plugins/kanmer/.codex-plugin/plugin.json | Codex’s canonical Kanmer skill distribution remains the plugin. |
| .agents/plugins/marketplace.json | Defines the Codex marketplace; its .agents location is a marketplace schema path, distinct from project skill discovery. |
| apps/gui/src/main/providers.ts | Existing TOML merge/unmerge, trust handling, and provider registry are the implementation seam. |
| docs/functional/frd/FRD-013-setup-as-reconciliation.md | Destination changes and config cleanup must be reconciliation, not blind overlay. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Provider claims require installed-binary evidence and mechanism-level positive controls. |
| Google Antigravity skills docs | Primary workspace skills path is .agents/skills; .agent is backward compatibility: https://antigravity.google/docs/skills/. |
| Google Antigravity MCP docs | Workspace MCP path is .agents/mcp_config.json: https://antigravity.google/docs/mcp/. |
| Google Antigravity CLI plugins/skills docs | CLI also directs workspace skills to .agents/skills: https://antigravity.google/docs/cli/plugins/. |
| Google Antigravity CLI projects docs | Workspace/project binding behavior: https://antigravity.google/docs/cli/projects/. |
| OpenCode skills docs | Native .opencode/skills path, discovery walk, and uniqueness requirement: https://opencode.ai/docs/skills/. |
| OpenCode MCP docs | Existing opencode.json MCP model remains correct: https://opencode.ai/docs/mcp-servers. |
| OpenAI Build Skills and config docs | Codex scans .agents, duplicates names, supports project config layers, and exposes per-path skills.config disables: https://learn.chatgpt.com/docs/build-skills, https://learn.chatgpt.com/docs/config-file/config-basic, https://learn.chatgpt.com/docs/config-file/config-reference. |

## Ripple effects

Connect/disconnect ordering, provider status, legacy copied-skill stamps, update offers, project TOML serialization, trust warnings, staleness reporting, gitignore rules, and packaged Connect behavior are affected. A Codex-only project must still work; an Antigravity-only project must retain .agents; a mixed project must show only plugin-qualified Kanmer skills to Codex while Antigravity loads the copied roster. OpenCode migration must preserve unrelated .agents content owned by Antigravity or the user.

## Out of scope

Antigravity’s MCP path and workspace-binding ticket, OpenCode’s MCP registration, Grok’s destination, Claude’s plugin install, the Kanmer roster/content, plugin marketplace names, and a general-purpose duplicate-skill resolver remain unchanged.
