## Antigravity Guidance from agy-customizations & antigravity-guide skills

### Customization Discovery & Scope
- **Hierarchy**: As documented in the Antigravity Customization System Guide, Antigravity discovers workspace customizations in `.agents/` (and legacy `.agent/`, `_agents/`, `_agent/`) at the repository root by walking up from the current directory.
- **IDE vs CLI Behavior**:
  - The **Antigravity IDE** natively discovers and binds workspace `.agents/skills/`, `.agents/rules/AGENTS.md`, and `.agents/mcp_config.json` for any opened project folder without additional flags.
  - The **Antigravity CLI (`agy`)** requires a project session binding (`--new-project` or `--project <id>`) to activate workspace `.agents/mcp_config.json` and `.agents/skills/`.
- **UI Copy & Provider Capability**:
  - The `"register-only"` badge is factually inaccurate because Kanmer Connect configures both `.agents/mcp_config.json` (MCP) and `.agents/skills/` (Skills).
  - Recommended UI update: Replace the reductive badge with specific capability indicators (e.g. `MCP: ConfigFile`, `Skills: Project`, `Dispatch: agy`) or clarify background dispatch status explicitly ("No background dispatch" vs "Dispatch supported via agy").
