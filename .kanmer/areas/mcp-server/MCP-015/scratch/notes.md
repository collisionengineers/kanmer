## Antigravity Guidance from agy-customizations & antigravity-guide

### Antigravity Plugin Architecture & Packaging
- **Standard Plugin Layout**:
  ```text
  plugins/kanmer/
  ├── plugin.json       # Manifest: {"name": "kanmer"}
  ├── mcp_config.json   # MCP configuration: {"mcpServers": {"kanmer": {"command": "node", "args": ["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]}}}
  ├── rules/            # Project rules applied when plugin is active
  │   └── AGENTS.md
  └── skills/           # Skills bundle
      └── kanmer-*/
          └── SKILL.md
  ```
- **Discovery & Installation**:
  - Global plugins: `~/.gemini/config/plugins/kanmer/`
  - Workspace plugins: `.agents/plugins/kanmer/`
  - CLI management: `agy plugin install <dir>`, `agy plugin enable <name>`, `agy plugin list`.
  - State tracking: Active plugins are recorded in `config.json` / `~/.gemini/antigravity-cli/settings.json` under `"plugins": { "kanmer": { "enabled": true } }`.

### Headless Dispatch Execution
- **CLI Binary**: `agy.exe` (located at `%LOCALAPPDATA%\agy\bin\agy.exe`).
- **Dispatch Invocation Command**:
  ```bash
  agy --new-project -p "<prompt>" --output-format text --print-timeout 5m
  ```
  *(Using `--new-project` or `--project <id>` is mandatory to establish workspace binding so that `.agents/mcp_config.json` and skills are loaded during execution).*
- **Do not pass `--disable-slash-commands`**, so that slash commands and skills remain enabled in print mode.
