# Files — SKILL-019

## Where the change lands

| Path | Why |
|---|---|
| apps/gui/src/main/providers.ts | Keep Codex/Claude marketplace plugins; change Antigravity skills from copySkills to its plugin install command while retaining project MCP registration; move OpenCode to .opencode/skills. |
| apps/gui/src/main/connect.ts | Support AGY’s plugin-install lifecycle separately from project MCP registration and reconcile legacy stamped .agents/skills only after plugin activation is proven. |
| apps/gui/src/main/providers.test.ts | Pin the plugin-vs-project matrix and the exact AGY install command/package root. |
| apps/gui/src/main/connect.test.ts | Prove AGY plugin failure reporting, idempotence, MCP independence, safe legacy cleanup, and preservation of user-owned .agents skills. |
| packages/core/src/staleness.ts | Replace .agents/skills as a current copied-skill destination with .opencode/skills while detecting legacy Kanmer-owned .agents installs and AGY plugin state where observable. |
| packages/core/src/staleness.test.ts | Cover current plugin/copy destinations, legacy state, and user-authored .agents content. |
| .gitignore | Add .opencode/skills; retain the legacy .agents/skills ignore until reconciliation has removed old generated trees safely. |
| scripts/check-plugin-sync.mjs | Assert the shipped Kanmer plugin remains skills-only and consumable by Codex and AGY without reintroducing the broken plugin MCP declaration. |
| apps/gui/src/main/providers.test.ts and packaging checks | Verify the plugin root shipped by the app is the path AGY installs and still contains all skill assets. |
| docs/functional/frd/FRD-012-connect.md | Change Antigravity R2 from project-copied skills to global skills-only plugin plus project MCP config; move OpenCode to .opencode. Requires authorization. |
| docs/functional/frd/FRD-023-agent-skills-system.md | Record the corrected per-host distribution matrix and uniqueness invariant. Requires authorization. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Correct the convergence consequence: shared reusable skills may be global plugins while board MCP registration stays project-scoped. Requires authorization or superseding ADR. |
| AGENTS.md | Update provider-install and repo-layout prose after governance changes. |

## Context files

| Path | What it tells the implementer |
|---|---|
| plugins/kanmer/skills | The roster AGY and Codex plugins consume. |
| plugins/kanmer/.codex-plugin/plugin.json | Codex plugin identity; AGY compatibility must not break it. |
| plugins/kanmer/.claude-plugin/plugin.json | Existing cross-host plugin metadata precedent. |
| plugins/kanmer/mcp/claude.mcp.json | The only remaining plugin MCP declaration; AGY must continue receiving skills only, not this incompatible MCP route. |
| docs/functional/frd/FRD-012-connect.md | Records prior measured AGY plugin success for 12 skills and MCP-016’s skills-only correction. |
| docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Requires installed-binary, mechanism-level provider evidence. |
| Google Antigravity CLI plugin docs | Defines namespaced global plugin bundles, skills/, and agy plugin install: https://antigravity.google/docs/cli/plugins/. |
| Google Antigravity MCP docs | Project MCP remains .agents/mcp_config.json: https://antigravity.google/docs/mcp/. |
| OpenCode skills docs | Native .opencode/skills destination: https://opencode.ai/docs/skills/. |
| OpenAI skills/plugin docs | Codex plugin remains its canonical reusable distribution path. |

## Ripple effects

Connect commands/output, provider status, packaging, AGY plugin idempotence, legacy copied-skill cleanup, staleness, disconnect semantics, update behavior, and release checks change. AGY’s plugin is global while its MCP registration is per project, so disconnecting one project must not silently uninstall a plugin another project uses.

## Out of scope

Changing project MCP registration, reintroducing plugin-supplied MCP for Codex/AGY, removing the Codex plugin, changing Claude/Grok, changing skill content, or deleting user-authored .agents skills are out of scope.
