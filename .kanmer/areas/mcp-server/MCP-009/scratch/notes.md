## Antigravity Parity Guidance from agy-customizations

### Provider Parity Specification for Antigravity
- **Customization Bundle Standard**:
  - Antigravity supports native multi-component plugins matching Claude and Codex:
    - Manifest: `plugin.json` (`{"name": "kanmer"}`)
    - MCP Configuration: `mcp_config.json` with stdio server definitions and `${PLUGIN_ROOT}` path expansion.
    - Rules: `rules/AGENTS.md`
    - Skills: `skills/<skill_name>/SKILL.md` (progressive disclosure)
- **Install Commands**:
  - `agy plugin install <target>` (or `agy plugin link <marketplace> <target>`)
  - Project level: placing files into `.agents/plugins/kanmer/` or `.agents/skills/` and `.agents/mcp_config.json`.
- **Validation**: Ensure all skills validate against strict YAML frontmatter parsing rules (`name` lowercase-hyphenated, `description` safe folded scalars).
