# Research — MCP-014: Grok plugin installation

## Question

How should Kanmer replace Grok’s project-local MCP configuration plus copied skills with Grok’s native plugin lifecycle while preserving real tool access, clean uninstall, provider isolation and the desktop runtime boundary?

## Verified current state

- The ticket records real Grok 0.2.111 measurements: `grok plugin` exposes install/uninstall/list/marketplace; `grok plugin install <dir> --trust` succeeds; `grok inspect` reports Kanmer enabled with 12 skills and one MCP server.
- Current `providers.ts` still defines Grok as:
  - registration in `<project>/.grok/config.toml` via shared TOML merge/unmerge;
  - copied skills in `<project>/.grok/skills`;
  - headless dispatch through `grok -p ... --cwd <root>`.
- GUI-079 has already moved Grok away from Claude’s `.mcp.json` into its own `.grok/config.toml`; that ownership defect must not be reimplemented or migrated twice.
- The packaged Kanmer plugin contains one Grok/Claude-compatible manifest and MCP descriptor:
  - `plugins/kanmer/.claude-plugin/plugin.json` points to `./skills/` and `./mcp/claude.mcp.json`;
  - the MCP command is `${KANMER_NODE:-node}` with `${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs`, no `cwd` and no `--root`.
- FRD-012 records that Grok expands `${CLAUDE_PLUGIN_ROOT}` and shell-style default variables and that a real plugin-installed tool call succeeded. It also records the runtime caveat: Node on PATH is the default; `KANMER_NODE` can point to the installed Kanmer Electron binary. A plugin cannot statically embed the selected install path.
- `grok mcp list` is not evidence. It may report no configured MCPs while the plugin server is active. Code/status verification must use the plugin lifecycle/inspection mechanism, and acceptance must invoke a real Kanmer tool from a project with no competing Connect registration.
- Current Connect treats registration and skill installation as independent `RegisterSpec`/`InstallSpec` phases. A Grok plugin supplies both, so forcing it through both current phases would install the plugin and still write stale `.grok/config.toml`/copy skills.
- Current disconnect removes registration first and cleans copied skills/AGENTS block only for `copySkills`. A plugin-managed provider requires one symmetric host uninstall command and no deletion of project skill/config paths it no longer owns.
- Plugin installation is user-scoped, while board discovery remains project-scoped through the Grok session cwd. One global plugin can serve multiple repositories; Connect must not create one plugin copy per project or uninstall the global plugin merely because one project disconnects unless the product explicitly changes the meaning of Disconnect.

## Ownership decision

Grok’s native plugin lifecycle becomes the owner of Kanmer skills and plugin MCP availability. The existing project `.grok/config.toml` registration is retired for new connects, and `.grok/skills` is no longer written.

Because the plugin is user-scoped, **Disconnect Grok means uninstall the user-scoped Kanmer plugin** and therefore affects every Grok workspace for that user. The GUI must state this explicitly and require the existing Connect/Disconnect confirmation behavior; it must not pretend the operation is project-local. If that product effect is unacceptable, the ticket must stop rather than keep two hidden ownership models.

## Provider model implication

Add a plugin-managed provider path rather than mislabel it as a config file or marketplace install:

- install command builder: `grok plugin install <pluginRoot> --trust`;
- uninstall command builder: exact CLI form verified against `grok plugin uninstall --help` before coding;
- installed-state probe: plugin list/inspect output pinned by fixtures, never `grok mcp list`;
- capability verification: `grok inspect` plus a real prompt that calls `get_status` from a clean project;
- no separate RegisterSpec write and no copy-skills reconciliation/AGENTS block for Grok.

The provider abstraction should express “this plugin provides MCP and skills” so Connect does not run duplicate phases. Claude/Codex marketplace paths and OpenCode/Antigravity copy paths remain unchanged.

## Runtime prerequisite

- Before installation, verify Grok CLI/version and plugin commands exist.
- Verify the plugin’s MCP runtime can launch in the environment that future Grok sessions will inherit:
  - either `node` is resolvable;
  - or `KANMER_NODE` is already set to a valid executable that can run the bundle with `ELECTRON_RUN_AS_NODE=1`.
- Do not use `setx`, mutate PATH or silently write a global environment variable. If neither runtime is available, refuse with exact instructions and leave existing project state untouched.
- Acceptance must launch a fresh Grok process with the same environment and invoke `get_status`; `inspect` alone proves discovery, not a functioning server.

## Migration and cleanup

On first successful plugin Connect:

1. preflight CLI/plugin/runtime;
2. install/upgrade the plugin through Grok;
3. inspect and invoke a real tool from the current project;
4. only after success, surgically remove Kanmer’s owned entry from `.grok/config.toml` and its stamped copied skill roster from `.grok/skills`;
5. preserve unrelated Grok config/skills and other providers’ files;
6. reconcile the managed AGENTS block only according to remaining copy-skills hosts.

If plugin verification fails, do not delete the working legacy project registration/skills. This ordering supplies rollback.

Disconnect:

1. warn that the plugin is user-scoped/all Grok workspaces;
2. run the verified Grok plugin uninstall command;
3. verify `grok inspect`/plugin list no longer reports Kanmer;
4. remove any remaining Kanmer-owned legacy Grok config/skills only, preserving unrelated state;
5. never touch Claude `.mcp.json` or another provider’s skill directory.

## Tests and evidence

- Pure provider tests pin exact install/uninstall/probe commands and prove no `.grok/config.toml`/`.grok/skills` outputs remain in the new path.
- Connect tests prove install/verify-before-legacy-cleanup, failure rollback, idempotent reinstall/update and symmetric uninstall.
- Real-host evidence records CLI version/help, plugin install output, `grok inspect`, actual `get_status` result from a Connect-free project, project config/skills before/after, and uninstall output.
- A negative control with only a Claude/other registration proves the tool call came from the plugin, not a competing project MCP entry.

## Open questions

None. Exact CLI spellings that can vary by Grok version are verification steps, not design choices; implementation must pin the measured supported version/output before modifying provider code.
