# Files — SKILL-019

## Where the change lands

| Path | Why |
|---|---|
| apps/gui/src/main/providers.ts | Change Codex from marketplace installation to project copySkills at .agents/skills; keep Antigravity on the same tree; move OpenCode to .opencode/skills. |
| apps/gui/src/main/connect.ts | Reconcile shared Codex/Antigravity ownership, provider connection order, and one-time detection/reporting of an already-installed global Codex plugin. |
| apps/gui/src/main/providers.test.ts | Pin the revised install matrix and ensure Connect never combines Codex plugin installation with project-local copying. |
| apps/gui/src/main/connect.test.ts | Prove shared-tree retention/removal, idempotent reconnect, OpenCode migration, existing-plugin warning, and user-skill preservation. |
| packages/core/src/staleness.ts | Add .opencode/skills while retaining .agents/skills and .grok/skills as canonical copied destinations. |
| packages/core/src/staleness.test.ts | Cover the revised destination matrix and legacy/current stamps. |
| .gitignore | Add .opencode/skills and retain .agents/skills and .grok/skills. |
| docs/functional/frd/FRD-012-connect.md | Replace Codex marketplace installation in Connect with project-local .agents copying; document the separate optional plugin route and one-time migration. Requires authorization. |
| docs/functional/frd/FRD-023-agent-skills-system.md | Define one skill surface per host and the shared Codex/Antigravity project roster. Requires authorization. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Correct the provider convergence decision using current Codex, Antigravity, and OpenCode discovery evidence. Requires authorization or superseding ADR. |
| AGENTS.md | Update provider-install and repository-layout prose after governance changes. |

## Context files

| Path | What it tells the implementer |
|---|---|
| .agents/plugins/marketplace.json | The Codex plugin remains distributable but is no longer installed by project Connect. |
| plugins/kanmer/.codex-plugin/plugin.json | Defines the optional plugin package that must remain valid independently. |
| apps/gui/src/main/providers.ts | Existing provider registry and shared-destination peer logic are the implementation seams. |
| apps/gui/src/main/connect.ts | Roster stamping and exact-owned cleanup protect user content. |
| docs/functional/frd/FRD-013-setup-as-reconciliation.md | Existing installations need a migration/reporting path, not an overlay. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Capability claims and migration behavior need mechanism-level evidence. |
| Official Codex, Antigravity, and OpenCode skill docs | Establish .agents as shared Codex/Antigravity project scope and .opencode as OpenCode native scope. |

## Ripple effects

Codex Connect commands/output, provider status, marketplace tests, shared copy ownership, update prompts, disconnect behavior, packaged resources, staleness, and documentation all change. Existing global plugin installations can still collide with new project copies, so Connect must detect and clearly offer the supported one-time global disable/uninstall route without doing it silently.

## Out of scope

Removing the Codex plugin from the distributable marketplace, changing Claude/Grok, changing MCP registration, changing skill content, or silently mutating a user’s global plugin state are out of scope.
