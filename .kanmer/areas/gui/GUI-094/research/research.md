# Research — portable Codex MCP registration

## Question

Does Kanmer create a hardcoded Codex MCP registration, can a relative registration replace it safely, and what must change to make a committed project registration portable?

## Findings

### 1. Pegasus contains a tracked, machine-specific registration

`C:\Users\PC\Documents\GitHub\pegasus\.codex\config.toml` is tracked by Git and names four absolute values from this machine:

- `command`: the installed `Kanmer.exe` under this user's `LOCALAPPDATA`;
- the first argument: the installed `resources/mcp/kanmer-mcp.cjs`;
- `--root`: Pegasus's canonical board worktree;
- `--repo-root`: the Pegasus source checkout.

This will not launch unchanged for a different user, installation directory, or checkout location. GUI-083 later made Connect-generated registration files gitignored, but an ignore rule does not untrack an already committed file and deliberately treated portability as future work. [[GUI-083]] is therefore related, not a duplicate.

### 2. Kanmer deliberately generates the hardcoded shape

`apps/gui/src/main/connect.ts:46-61` builds the invocation from `process.execPath`, `process.resourcesPath`, `boardRoot`, and `sourceRoot`. `apps/gui/src/main/providers.ts:278-306` serialises that invocation into `[mcp_servers.kanmer]`. Tests at `providers.test.ts:271-281` require the absolute executable and `--root`.

FRD-012 R1/R1c/R7 explicitly describes current Codex Connect registrations as absolute and root-pinned. This ticket changes an accepted product contract, not only code.

### 3. Codex supports the necessary configuration fields, but does not document an MCP-specific relative-path base

Official OpenAI documentation says project-scoped overrides may live in `.codex/config.toml` for trusted projects. For stdio MCP servers it documents `command`, optional `args`, optional `env`, and optional `cwd`. It describes `command` as the launcher and `cwd` as the child working directory, but the current reference does not state that MCP command or argument paths are resolved relative to the declaring config file.

Implication: a design must not assume an undocumented “relative to .codex/config.toml” expansion rule. A real Codex launch from isolated checkouts is required as proof.

Source: OpenAI Configuration Reference and Model Context Protocol documentation, fetched 2026-08-17.

### 4. A relative bundle path alone is not portable

The server bundle is installed with Kanmer under the machine's application install directory, not inside the project. A path relative to the repository cannot locate it. Setting `cwd = "."` only changes the child working directory; it does not create a project-relative copy of the installed bundle. The repo's own FRD-012 R6 evidence also shows that moving cwd to a plugin cache solves script lookup at the cost of losing workspace board discovery.

The portable abstraction is therefore a stable launcher command discoverable by the operating system, not a relative path from the repository to an installation artifact.

### 5. Board and source absolute arguments are unnecessary once startup begins in the workspace

ADR-0012 and `packages/mcp-server/src/root.ts` already implement discovery from process cwd: at each ancestor they probe `.kanmer` and `.worktrees/*/.kanmer`, prefer `.worktrees/kanmer`, and derive the source repo from a board-worktree path. Therefore a Codex server launched with the project/workspace as cwd should omit both `--root` and `--repo-root`.

This must be proven through `get_status`: `rootSource` should be discovery-based and `repoRoot` must be the relocated checkout.

### 6. Recommended end state

Install a dedicated `kanmer-mcp` launcher as an OS-resolvable command. The launcher owns the machine-specific work: locate its sibling Kanmer installation and MCP bundle, set `ELECTRON_RUN_AS_NODE=1`, preserve the caller's workspace cwd, and start the bundle. Connect then writes only:

```toml
[mcp_servers.kanmer]
command = "kanmer-mcp"
```

No project, board, user-profile, or install path belongs in the committed file. On Windows, prefer a real executable launcher over assuming a `.cmd` file is directly executable by every MCP host. Packaging must install it on the current user's PATH (or an equally host-resolvable command mechanism) and uninstall/upgrade it cleanly.

### 7. Scope boundary

This ticket owns Codex Connect portability, the launcher/package contract it requires, governing-doc changes, and tests. It does not rewrite Pegasus or other consumer repositories. Once shipped, those repos can reconnect and deliberately untrack/commit the portable registration in their own changes.

## Conclusion

Yes, Kanmer currently creates a hardcoded MCP registration. A simple relative path is not sufficient because the executable and bundle are outside the repository and Codex does not document a config-file-relative MCP path contract. The viable route is a portable launcher command plus existing board discovery, followed by changing Connect to emit no absolute paths or root flags.
