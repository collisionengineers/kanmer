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

### 2026-08-22 host probe

Read-only Windows probe evidence: \`agy --version\` returned \`1.1.14\`; \`agy --help\` exposed \`--add-dir\`, \`--new-project\`, \`--project\`, and \`-p/--print\`; \`agy plugin --help\` exposed \`list/import/install/uninstall/enable/disable/validate/link\`; \`agy plugin list\` returned \`No imported plugins.\`; \`agy plugin validate plugins/kanmer\` failed exactly with \`Error: missing plugin.json: GetFileAttributesEx plugins\\\\kanmer\\\\plugin.json: The system cannot find the file specified.\` because the descriptor is not yet implemented. \`agy plugin inspect --help\` is unsupported (unknown command), and the CLI treats validate/install/uninstall \`--help\` as path/target/name rather than help; no real plugin identifier was mutated. The uninstall probe used the literal \`--help\` name and returned \`Uninstalled plugin "--help"\`; a subsequent list remained \`No imported plugins.\`. No plugin/project state or credentials were used. Real install/bound tool/unbound control/uninstall remain INCONCLUSIVE and will not be claimed from PONG or process output.
