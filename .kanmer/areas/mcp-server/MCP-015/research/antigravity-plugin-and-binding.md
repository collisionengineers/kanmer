# Research — MCP-015: Antigravity plugin install and bound dispatch

## Question

How should Kanmer use Antigravity’s native plugin installer and enable background dispatch while guaranteeing every launched `agy` session is bound to the project whose board it must read?

## Resolved prerequisite: GUI-073 adjudication

GUI-073 is Done and settles the disputed capability with measured Antigravity CLI 1.1.13 evidence:

- `agy -p` works with piped stdout and exits 0; the old “piped print mode is broken” premise is refuted.
- `.agents/skills/` and `.agents/mcp_config.json` are valid workspace inputs.
- A bare `agy` session ignores them because it binds to `default-cli-project`, whose project resources contain no folder. Current working directory, Git root and workspace trust do not bind it.
- Binding exists only when the command line carries one of:
  - `--new-project`;
  - `--project <id>` whose record contains the folder URI;
  - `--add-dir <path>`, which binds for the session and persists nothing.
- `--add-dir <sourceRoot>` is therefore the correct background-dispatch binding: deterministic, ticket/project scoped, no persistent Antigravity project registry and no id allocation/recovery problem.
- Workspace MCP servers do not appear as named top-level tools. Verification must make an actual tool call through Antigravity’s generic MCP mechanism and confirm board data, not grep a tool list.

## Current implementation

- Antigravity provider writes project `.agents/mcp_config.json` and copies `.agents/skills`, but leaves `dispatch:false` because the existing dispatch args would be unbound.
- Settings/manual correctly say “no background dispatch” and tell interactive CLI users to use `agy --add-dir <project>` or `--new-project`.
- Antigravity’s native `agy plugin install <dir>` is measured to process skills and MCP server definitions. The plugin is user-scoped and supports uninstall/enable/disable/validate/list operations.
- Current repository plugin tree contains skills and host manifests but, after MCP-016, deliberately no root `.mcp.json`/Antigravity server advertisement. MCP-016 removed the broken relative-path form that `agy` joined to the session cwd.
- Vendor evidence in GUI-073 names the documented plugin MCP file as `plugins/<plugin_name>/mcp_config.json` and the usable shape as `{"mcpServers":{...}}`. The previously installed Kanmer plugin used a root `mcp_config.json` with `${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs`.

## Plugin MCP design

MCP-015 must reintroduce **an Antigravity-specific documented `plugins/kanmer/mcp_config.json`**, not the deleted generic `.mcp.json` and not a codex manifest key. It must be validated against real `agy plugin validate/install` before shipping.

Preferred measured shape:

```json
{
  "mcpServers": {
    "kanmer": {
      "command": "node",
      "args": ["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]
    }
  }
}
```

Use only variable forms proven by Antigravity. Do not copy `${CLAUDE_PLUGIN_ROOT}` or shell-style defaults unless a positive-control tool call proves Antigravity expands them. If Node is not on PATH, Connect refuses with runtime setup guidance rather than writing an absolute machine path, changing PATH or resurrecting project config as fallback.

The server receives the bound workspace cwd from `agy --add-dir`; it therefore needs no `cwd`, `--root` or `--repo-root` in plugin config.

## Native plugin ownership

- Reuse the explicit plugin-managed provider lifecycle introduced by MCP-014 if it has landed; do not create a second abstraction.
- Antigravity Connect installs/validates the user-scoped plugin; it no longer writes `.agents/mcp_config.json` or copies `.agents/skills` for new connects.
- Before removing legacy project state, validate/install the plugin, run `agy plugin list/inspect/validate` as supported, then start a bound fresh session and invoke `get_status` successfully.
- Only after that functional proof remove Kanmer-owned legacy project config/skills surgically, preserving unrelated `.agents` content and any other provider ownership.
- Disconnect uninstalls the user-scoped plugin with an explicit all-workspaces warning and cleans residual owned legacy project state.

## Dispatch design

The exact shared provider metadata after MCP-020/MCP-014 should define Antigravity as:

```text
cli: agy
args(prompt, sourceRoot): ["--add-dir", sourceRoot, "-p", prompt]
```

The supported CLI’s help must be rechecked for argument order; tests pin the real accepted form. No `--new-project` is used because it persists project records and creates cleanup/identity complexity. No `--project` is used because Kanmer has no durable Antigravity project-id owner.

Dispatch acceptance has two layers:

1. process layer: piped stdout returns expected controlled output/exit;
2. capability layer: a task-scoped dispatch started in a project with no competing registration actually invokes a Kanmer MCP tool and writes/reads the intended ticket deliverable.

Starting a process or printing PONG is insufficient for final dispatch acceptance.

## UI and documentation impact

- `dispatch:true` removes the “no background dispatch” badge and adds Antigravity to the dispatch menu from the same provider SSOT.
- Connect copy must stop claiming every registration is project-local; Antigravity/Grok native plugins are user-scoped.
- Interactive CLI guidance still requires `--add-dir <project>` (or a user-managed saved project) because installing the plugin does not bind a bare session.
- The Antigravity IDE remains outside CLI proof unless separately driven; do not claim its behavior solely from CLI evidence.

## Risks

- Reintroducing `.mcp.json` would revive MCP-016’s broken advertisement.
- Using cwd without `--add-dir` would produce a blind dispatched agent.
- A competing project `.agents/mcp_config.json` could make a tool call pass even if the plugin MCP is broken. Acceptance uses a clean project and records plugin source.
- Plugin install/uninstall is user-scoped; hidden project-local wording would be destructive/misleading.
- Runtime-variable assumptions are host-specific. Every token in `mcp_config.json` needs a real positive control.

## Open questions

None. CLI spellings/variable support are measurements to pin, not unresolved design choices.
