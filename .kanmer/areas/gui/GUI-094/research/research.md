# Research — exact portable Codex MCP registration

## Research question

Kanmer Connect currently writes absolute Windows installation, source-repository, and board-worktree paths into a trusted project's `.codex/config.toml`. What exact supported design makes that committed registration usable on another supported machine without changing the behavior of Claude Code, OpenCode, Grok, or Antigravity?

## Evidence

### Pegasus proves the defect is real and committed

`C:\Users\PC\Documents\GitHub\pegasus\.codex\config.toml` is tracked by Git. Its Kanmer entry names:

- `C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe`;
- the same installation's `resources\mcp\kanmer-mcp.cjs`;
- Pegasus's absolute `.worktrees\kanmer` board root;
- Pegasus's absolute source root.

A different username, install location, drive, or checkout location invalidates it. GUI-083 later added an ignore rule for newly generated `.codex/config.toml` files, but Git ignores do not untrack Pegasus's existing file and GUI-083 explicitly deferred portable invocation. [[GUI-083]] is related history, not a duplicate.

### Kanmer generates this shape intentionally

`apps/gui/src/main/connect.ts:46-61` constructs one shared `Invocation` using `process.execPath`, `process.resourcesPath`, `boardRoot`, and `sourceRoot`. `connectAgent` at lines 477-553 passes that same invocation to every provider. `apps/gui/src/main/providers.ts` serializes it into each provider's format. The Codex test at `providers.test.ts:271-281` currently requires an absolute executable and `--root`.

FRD-012 R1, R1c, and R7 explicitly describe Codex Connect as absolute and root-pinned. This ticket changes an accepted contract and its tests, not only an accidental consumer file.

### What OpenAI Docs establishes—and does not establish

Official OpenAI documentation, fetched 2026-08-17:

- Codex supports project-scoped `.codex/config.toml` for trusted projects: https://developers.openai.com/codex/mcp/ and https://developers.openai.com/codex/config-reference/
- An stdio MCP server has required `command`, optional `args`, optional `env`, and optional `cwd`.
- `command` is the launcher command; `cwd` is the working directory of the spawned MCP process.
- The ChatGPT desktop app, Codex CLI, and IDE extension share the same Codex-host MCP configuration.
- The reference expressly documents config-file-relative resolution for `agents.<name>.config_file`, but does not make the same promise for `mcp_servers.<id>.command` or its arguments.

Therefore the design must not depend on a relative MCP path being resolved from `.codex/config.toml`. It must use an operating-system command and prove launch through a real Codex tool call.

### A repo-relative bundle path cannot work

The bundle is installed under Kanmer's application directory, not committed inside each consumer repository. `cwd = "."` cannot make a repository-relative path find an external installed bundle. Pointing cwd at the installation would also destroy the workspace cwd that board discovery needs. Relative path alone is the wrong abstraction.

### Root flags are now redundant for Codex project registration

ADR-0012 and `packages/mcp-server/src/root.ts` already resolve a board in this order:

1. explicit `--root`;
2. `KANMER_ROOT`;
3. discovery from process cwd upward, checking `.kanmer` and `.worktrees/*/.kanmer`, preferring `.worktrees/kanmer`;
4. explicit initialization;
5. fatal not-found error.

Core derives the source repo from `<repo>/.worktrees/<board>`. If Codex launches the MCP with the project workspace cwd, no `--root` or `--repo-root` is required. The correct proof is `get_status`: discovery-based `rootSource`, board-worktree `projectRoot`, and source-checkout `repoRoot`.

### Exact Windows launcher contract

Kanmer currently ships only a Windows NSIS installer. Portability in this ticket means across supported Windows machines and user profiles; it does not claim that a `cmd.exe` registration works on macOS or Linux.

The committed entry will be:

```toml
[mcp_servers.kanmer]
command = "cmd.exe"
args = ["/d", "/s", "/c", "\"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\""]
```

Why this shape:

- `cmd.exe` is an OS launcher, not a Kanmer installation path.
- `%LOCALAPPDATA%` is expanded by `cmd.exe` on the target machine.
- The shim path is fixed and absolute after expansion, so a trusted repository cannot shadow it with its own `kanmer-mcp.cmd`.
- No PATH update or process restart is required.
- No project, board, username, drive, or chosen installation directory appears in the committed TOML.
- `/d` disables AutoRun registry commands; `/s` gives defined quote handling around the `/c` command string.

The installer copies a static shim to `$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd` and writes `HKCU\Software\Kanmer`, value `InstallDir`, to the selected `$INSTDIR`. The shim reads that value using the system `reg.exe`, validates both installed artifacts, sets `ELECTRON_RUN_AS_NODE=1` only in its local environment, and launches:

```text
<InstallDir>\Kanmer.exe
<InstallDir>\resources\mcp\kanmer-mcp.cjs
```

It never changes cwd, so the MCP inherits Codex's project cwd. Normal startup writes nothing except MCP protocol bytes produced by the bundle; diagnostics go to stderr. It captures and returns the child exit code. A reserved `--probe` mode checks registry and artifact presence without starting an MCP session, for Connect and packaging verification.

The static shim must use `%SystemRoot%\System32\reg.exe` rather than a PATH-resolved `reg.exe`. It must parse only the named `InstallDir` value, quote the resulting directory, and reject missing/empty values or missing sibling artifacts with distinct nonzero exits.

### NSIS lifecycle is concrete

Electron-builder supports `nsis.include` and calls `customInstall` after application files are installed and `customUnInstall` before installed files are removed. This is present in the installed `app-builder-lib` templates.

Add `apps/gui/build/installer.nsh`:

- `customInstall`: create `$LOCALAPPDATA\Kanmer\bin`; copy `$INSTDIR\kanmer-mcp.cmd` there; write HKCU `Software\Kanmer\InstallDir = $INSTDIR`.
- upgrades run the same macro and atomically replace the shim/value with the current installation;
- `customUnInstall`: delete the exact shim, delete `InstallDir`, remove the Kanmer registry key only if empty, and remove `bin`/parent directories only if empty;
- no PATH or global environment variable is modified;
- because `perMachine: false`, HKCU and `$LOCALAPPDATA` match the installer scope.

The static shim is included at install root through electron-builder `extraFiles`, while the server remains under `resources/mcp`.

### Dev-mode behavior must be explicit

A source-launched GUI does not own an installed NSIS shim. Codex Connect from dev mode must not silently fall back to writing absolute paths. It will run the same portable `--probe` command:

- if an installed Kanmer launcher is healthy, write the portable config;
- otherwise refuse the Codex registration with a message to build/install Kanmer first;
- do not alter other providers' existing dev-mode behavior.

This preserves the portability invariant in every code path.

### Provider implications

The current defect is amplified by one shared invocation. The change must make invocation selection provider-specific:

| Provider | Registration after GUI-094 | Change |
|---|---|---|
| Codex | `cmd.exe /d /s /c "<fixed local shim>"`, no env/root flags | Changed |
| Claude Code | current Electron-as-Node absolute invocation and explicit roots via CLI | Byte-for-byte behavior retained |
| OpenCode | current `opencode.json` absolute invocation | Retained |
| Grok | current `.grok/config.toml` absolute invocation | Retained; it may still share the TOML serializer, but receives the existing invocation |
| Antigravity | current `.agents/mcp_config.json` absolute invocation | Retained |
| Codex plugin | skills only, no MCP server | Retained |

No provider is migrated opportunistically. Making another provider portable requires its own host launch proof because capability claims are provider-specific under ADR-0009/FRD-012.

### Secondary code implications

- `tomlMcpServersMerge` is a generic serializer and does not need provider-specific logic; only invocation selection changes.
- Legacy global Codex entries still carry `--root`/`--repo-root`. `legacyCodexEntries` must continue parsing those. `classifyLegacyCodexEntry` already treats presence of a trusted project registration as the replacement, so no algorithm change is expected; add regression coverage for a rootless portable replacement.
- Core staleness already says a registration with no `--root` is supported discovery, not stale (`staleness.ts:660-662`). Add a portable-Codex regression test; no production change is expected.
- MCP-session detection still sees the child `Kanmer.exe` with `kanmer-mcp.cjs` in its command line. The temporary `cmd.exe` parent does not change the installed child predicate; add a regression fixture.
- Only Codex's `.codex/config.toml` becomes shareable. Other Connect registrations remain machine-local and gitignored.
- Existing consumer files are not rewritten remotely. Reconnect writes the new shape locally; already tracked repos such as Pegasus must commit that resulting change themselves.

### Security and failure behavior

- Fixed expanded shim path prevents repository-local command shadowing.
- Trusted-project requirement remains visible; portability does not bypass Codex trust.
- `/d` avoids user AutoRun injection into cmd startup.
- The shim uses system `reg.exe`, quotes install paths, writes diagnostics to stderr, and emits no normal stdout before MCP starts.
- Missing shim: Codex reports command failure; Connect preflight reports reinstall Kanmer.
- Missing registry value or target artifact: shim returns a distinct error telling the user to reinstall/reconnect.
- Board discovery failure remains the MCP server's existing fatal diagnostic naming every tried path.
- A stale shim from a failed uninstall is harmless: without its registry/artifacts its probe and launch fail explicitly.

## Conclusion

Kanmer does create the hardcoded registration. The implementation-ready solution is not an MCP-relative path and not PATH mutation: it is a Codex-only `cmd.exe` registration to an installer-owned, fixed per-user shim, with install location held in HKCU and board identity discovered from Codex's cwd. Other providers retain their current registrations.
