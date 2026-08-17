# Open questions — SKILL-019

- [x] **Can AGY receive Kanmer skills through a plugin?** — Yes. Official docs support namespaced plugins with skills/, and FRD-012 records a measured Kanmer install processing all 12 skills.
- [x] **Why was AGY’s plugin route previously rejected?** — Its plugin-supplied MCP server was broken and global MCP scope was wrong. MCP-016 removed that declaration. The skills-only plugin route remains valid.
- [x] **Where does AGY’s board connection live?** — Project .agents/mcp_config.json, independently of the global skills plugin.
- [x] **Where does OpenCode receive skills?** — Its native .opencode/skills project directory.
- [x] **Does Codex need project suppression or copied skills?** — No. Codex remains plugin-installed and Kanmer stops generating project .agents/skills in the current provider matrix.
- [x] **How is an AGY plugin removed on project disconnect?** — It is not silently removed because it may serve other projects. Disconnect removes only project MCP state; plugin uninstall is an explicit global action.

## Parked (explicitly deferred)

No questions parked.
