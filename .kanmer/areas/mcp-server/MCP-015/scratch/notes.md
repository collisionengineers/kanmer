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

### 2026-08-22 implementation and deterministic rails

MCP-015 implementation evidence: Antigravity native plugin descriptors are present at plugins/kanmer/plugin.json and plugins/kanmer/mcp_config.json. The root descriptor uses command: "node" with args: ["\${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]. Post-build read-only validation agy plugin validate plugins/kanmer exited 0 and reported [ok] plugins/kanmer, skills: 12 processed, and mcpServers: 1 processed. Descriptor SHA-256: A9999F8144C46FE2D16A0226B3C1738FFB6FB0638589505DBF0468D657646541.

No real plugin install, uninstall, bound get_status call, or unbound control was run: no disposable host project/credentials were authorized. Those host lanes remain INCONCLUSIVE; no capability is inferred from PONG, process start, plugin list, or validation.

Deterministic rails: core dispatch focused 4/4; GUI focused providers/connect/dispatch 97/97; full core 13 files/267 tests passed; full GUI with --no-file-parallelism 38 files/356 tests passed; all-workspace typecheck passed. plugin:check, verify:docs, verify:agents-block, verify:skills, check:manual, main smoke 224/224, protocol smoke 46/46, and discovery smoke 13/13 passed.

Standard parallel full GUI was also run twice and preserved the exact runner-only failure: disconnect peer safety > retains the shared block when another copy-skills host has malformed registration timed out at 5,000 ms with EBUSY: resource busy or locked, rmdir 'C:\\Users\\Alex\\AppData\\Local\\Temp\\kanmer-connect-OTwCPj' (the first run used kanmer-connect-sJOvuW); the focused 29/29 rerun passed.
