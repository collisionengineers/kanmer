# Plan — exact implementation of portable Codex Connect

## Outcome

On every supported Windows machine with Kanmer installed, the repository can commit this byte-identical project registration:

```toml
[mcp_servers.kanmer]
command = "cmd.exe"
args = ["/d", "/s", "/c", "\"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\""]
```

It contains no user, drive, selected install directory, repository, board-worktree, or bundled-script absolute path. Codex starts the installer-owned shim from a fixed per-user location. The shim finds the selected Kanmer installation through HKCU, starts the bundled MCP without changing cwd, and existing board discovery resolves the correct checkout and canonical board worktree.

Only Codex Connect changes. Claude Code, OpenCode, Grok, Antigravity, plugin installation, and dispatch retain their existing contracts.

## Why this approach wins

- **Versus repo-relative paths:** the installed bundle is not in the repo, and OpenAI Docs does not define an MCP-relative base.
- **Versus `cwd` pointing at the install:** that would make script lookup work while breaking workspace board discovery.
- **Versus a bare PATH command:** PATH refresh is process-dependent and current-directory command shadowing is avoidable.
- **Versus environment placeholders in `command`:** OpenAI Docs does not promise command interpolation; `cmd.exe` performs the expansion explicitly.
- **Versus a new native launcher:** the fixed per-user batch shim meets location, stdio, cwd, and exit requirements without adding a native compiler/toolchain.
- **Versus remaining gitignored:** hiding generated files does not make already committed registrations work elsewhere.

## Exact runtime chain

1. Codex trusts and loads `<repo>/.codex/config.toml`.
2. Codex starts `cmd.exe` with `/d /s /c` and the quoted fixed shim path.
3. `cmd.exe` expands the target machine's `%LOCALAPPDATA%`.
4. `kanmer-mcp.cmd` reads HKCU `Software\Kanmer\InstallDir` using `%SystemRoot%\System32\reg.exe`.
5. The shim validates `<InstallDir>\Kanmer.exe` and `<InstallDir>\resources\mcp\kanmer-mcp.cjs`.
6. The shim sets `ELECTRON_RUN_AS_NODE=1` in its local environment and directly invokes those two paths.
7. The wrapper does not `cd`; the child retains Codex's project cwd and inherited stdio.
8. MCP root resolution uses ADR-0012 discovery and core derives the source root.
9. The child exit code propagates through the shim and `cmd.exe` to Codex.

## Implementation steps

### 1. Add the static launcher shim

Create `apps/gui/build/kanmer-mcp.cmd`.

Required behavior:

- begin with `@echo off` and `setlocal`;
- accept only one launcher-owned switch, `--probe`;
- query exact HKCU value `Software\Kanmer\InstallDir` with the system `reg.exe`;
- reject missing/empty registry data;
- construct and quote the installed Electron and MCP paths;
- reject either missing artifact with a distinct nonzero exit;
- in `--probe`, print a concise success description and exit zero without starting MCP;
- in normal mode, set `ELECTRON_RUN_AS_NODE=1`, invoke Electron-as-Node, capture `ERRORLEVEL`, and return it after `endlocal`;
- normal success emits no wrapper stdout or stderr; only the MCP bundle owns stdout;
- never change cwd, use `start`, open a window, or resolve helper executables from the repository;
- no arbitrary argument forwarding is needed by the committed registration. If tests need explicit roots they continue using the existing direct smoke path.

Define error exits in the supporting comments/tests:

- 2: registry/install location missing;
- 3: `Kanmer.exe` missing;
- 4: MCP bundle missing;
- child failures: propagate the child's own exit code.

### 2. Add the NSIS lifecycle

Create `apps/gui/build/installer.nsh` and set `nsis.include: build/installer.nsh`.

`customInstall`, which electron-builder calls after app files exist:

- create `$LOCALAPPDATA\Kanmer\bin`;
- copy `$INSTDIR\kanmer-mcp.cmd` to a temporary name in that directory and rename it to the final name, avoiding a partially written shim;
- write `HKCU\Software\Kanmer\InstallDir` as `REG_SZ $INSTDIR`;
- upgrades repeat these operations and replace stale values/files.

`customUnInstall`, called before app files are removed:

- read the recorded `InstallDir`;
- delete the fixed shim only when the recorded install is the uninstalling `$INSTDIR`, so uninstalling an obsolete parallel install cannot remove a newer install's launcher;
- delete `InstallDir` under the same ownership condition;
- delete `HKCU\Software\Kanmer` only if it has no remaining values/subkeys;
- remove `bin` and `Kanmer` directories only if empty;
- never touch PATH, another user's hive, or unrelated registry values.

Keep `perMachine: false`; a per-machine installer would require a different location/hive contract and is out of scope.

### 3. Package the shim

In `apps/gui/electron-builder.yml`:

- add `extraFiles: [{ from: build/kanmer-mcp.cmd, to: kanmer-mcp.cmd }]`;
- add `nsis.include: build/installer.nsh`;
- retain `allowToChangeInstallationDirectory: true`;
- retain the existing MCP bundle under `resources/mcp`.

The selected install directory remains arbitrary because HKCU provides the indirection.

### 4. Make invocation provider-specific

In `apps/gui/src/main/connect.ts`:

- rename the existing function to `installedElectronInvocation(boardRoot, sourceRoot)`; its output remains byte-equivalent;
- add one constant/helper for the exact portable Codex invocation;
- add `serverInvocation(id, boardRoot, sourceRoot)`: Codex gets portable; every other provider gets the existing installed-Electron invocation;
- update comments and `Invocation` documentation in `providers.ts` so it no longer claims every invocation is Electron plus root;
- do not fork the TOML serializer: Codex and Grok may keep sharing `tomlMcpServersMerge` because their passed invocations differ;
- do not change config ownership, skill installation, dispatch, or disconnect.

### 5. Preflight before writing Codex config

Before any Codex config mutation, execute the exact portable command with `--probe`.

- inject/extract the execution seam so unit tests do not require a real install;
- use projectRoot as cwd, matching real host launch;
- on failure, return `ok: false`, do not write/replace `.codex/config.toml`, and report whether the shim, registry value, executable, or bundle is missing;
- recommend reinstalling/updating Kanmer rather than generating an absolute fallback;
- source-launched GUI follows the same rule: it may use a healthy installed launcher, otherwise it refuses Codex Connect;
- after a successful probe, preserve the current atomic TOML merge, best-effort legacy removal, trust note, and skills installation.

### 6. Preserve other providers exactly

Add table-driven tests around provider selection:

- Claude Code still receives `process.execPath`, bundle argument, `--root`, optional `--repo-root`, and `ELECTRON_RUN_AS_NODE`;
- OpenCode, Grok, and Antigravity retain their current serialized values;
- Codex alone receives `cmd.exe`, the four fixed args, empty env, and no root flags;
- provider config paths, CLI commands, marketplace commands, skill destinations, and dispatch arguments do not change.

This test is a release rail, not just reassurance: a future shared-invocation refactor must fail if it migrates another provider silently.

### 7. Preserve legacy cleanup and staleness semantics

Legacy cleanup:

- retain parsing of old global `kanmer-*` entries and their root arguments;
- add a regression where the consumer project has the new rootless `.codex/config.toml`; it is a valid trusted replacement and makes the old global entry drainable;
- no production algorithm change unless that test disproves the current reading.

Staleness:

- add exact portable TOML to core staleness tests;
- assert it produces no `mcp-registration` stale row;
- retain wrong explicit-root detection for old/provider registrations;
- do not add TOML parsing or launcher awareness to core.

### 8. Preserve updater session safety

Add a launcher-started process fixture to `mcp-sessions.test.ts`:

- the relevant process remains the child installed `Kanmer.exe`;
- its command line still contains `kanmer-mcp.cjs`;
- install-directory prefix matching still includes it;
- unrelated `cmd.exe` processes are never classified by image name alone.

No production change is expected. If the real packaged probe contradicts that, fix the child detection in the same ticket because updater safety is part of Connect's runtime contract.

### 9. Make Codex config intentionally shareable

After—not before—the packaged and two-location proof:

- remove only `.codex/config.toml` from Kanmer's `.gitignore`;
- rewrite the comment to distinguish portable Codex config from machine-local provider files;
- keep `.mcp.json`, `.grok/config.toml`, `opencode.json`, `.agents/mcp_config.json`, and copied skill trees ignored;
- update the providers/ignore rail so it does not require portable Codex config to be ignored;
- do not blanket-unignore `.codex/`.

GUI-094 does not edit Pegasus. Its release/upgrade note tells consumer repos to reconnect, review the diff, and commit or untrack/recommit according to their own policy.

### 10. Extend package and installer verification

`scripts/check-updater-package.mjs`:

- assert `win-unpacked\kanmer-mcp.cmd` exists;
- assert it contains the fixed registry key, system `reg.exe`, Electron-as-Node setup, resource path, probe branch, and no hardcoded build-machine path;
- retain the existing resource bundle check;
- update check count/output.

Add a Windows script test for wrapper behavior with a controlled registry seam if the static batch can accept an internal test-only override safely. If no safe registry seam exists, keep unit tests to static contract and use the controlled installed lifecycle as the behavioral proof—do not add a production override solely for tests.

Controlled installer proof:

1. snapshot Kanmer's exact HKCU key and fixed shim if present;
2. install the newly built artifact silently into an explicit temporary custom directory;
3. assert shim and registry point to that directory;
4. run `--probe`;
5. upgrade/reinstall and assert idempotence;
6. uninstall and assert only owned shim/value are removed;
7. restore any pre-existing installation state if the test machine is not disposable.

Prefer a disposable Windows CI/user environment. Never destructively exercise this against an unrecorded real user installation.

### 11. Prove real Codex behavior in two locations

Create two isolated, trusted Git fixtures on different absolute paths:

- each source repo has its own canonical `.worktrees/kanmer/.kanmer`;
- copy the exact same portable `.codex/config.toml` bytes to both;
- launch a fresh Codex host from each source root;
- invoke Kanmer `get_status`, not only `codex mcp list`;
- assert:
  - the MCP tool is callable;
  - `rootSource` is `cwd-worktree` or `ancestor-worktree` as appropriate;
  - `projectRoot` is that fixture's board worktree;
  - `repoRoot` is that fixture's source root;
  - server path is the installed bundle;
  - neither config contains either fixture path;
- run from a linked ticket worktree too, proving discovery crosses a `.git` file to the source repo;
- negative case: remove/rename the fixed shim in a disposable environment and record the clear startup failure.

### 12. Update governing documentation

FRD-012:

- replace Codex's absolute/root-pinned invocation in R1 with the exact TOML;
- amend R1c: Codex config is shareable on supported Windows hosts; other provider artifacts remain machine-local;
- record shim/HKCU ownership, probe, failure behavior, trust requirement, and dev-mode refusal;
- amend R7 so Codex Connect consumes discovery just like the plugin path, while explicitly saying other providers retain their current roots;
- add acceptance criteria for two-location real tool calls, custom install, upgrade/uninstall ownership, normal stdout cleanliness, and provider non-regression;
- preserve the superseded behavior in an upgrade/history note rather than pretending it never shipped.

ADR-0012:

- add Codex Connect as an intentional discovery consumer;
- state omission of `--root`/`--repo-root` is safe only while cwd remains the workspace;
- do not change the accepted discovery order.

Create and link a focused launcher ADR before implementation leaves Preparing if governance review agrees the fixed shim/HKCU contract is architectural. Its decision is already fixed by this plan; authoring it must not reopen launcher selection.

Release notes:

- users reconnect Codex projects after updating;
- existing running sessions restart to reload project config, not to pick up PATH;
- tracked absolute configs need an ordinary consumer-repo commit;
- other providers require no reconnect.

## Verification commands and evidence

Run from the ticket worktree during implementation:

- `npm run test:scripts`
- `npm test`
- `npm run typecheck`
- `npm run dist`
- `npm run dist:check`
- packaged MCP smoke through the installed shim
- controlled NSIS install/probe/upgrade/uninstall lifecycle
- two-location real Codex `get_status` calls
- `git diff --check`
- `git status --short`

The post-implementation report records exact commands, outputs, artifact paths/hashes, both config hashes, both `get_status` payloads, installer registry/shim before/after evidence, and explicit unchanged-provider test results.

## Risks and mitigations

- **Command-string quoting:** pin the exact four Codex args and run a real path-with-spaces custom install.
- **Repository command shadowing:** fixed expanded LOCALAPPDATA shim path; never a bare wrapper name.
- **cmd AutoRun injection:** `/d`.
- **Stdout corruption:** wrapper is silent in normal mode; packaged raw JSON-RPC smoke.
- **Custom install movement:** installer rewrites HKCU + shim on every install/upgrade.
- **Old uninstall removes new launcher:** ownership comparison against recorded `InstallDir`.
- **Dev GUI writes absolutes:** explicit probe-or-refuse, no fallback.
- **Other-provider regression:** provider matrix tests retain exact old invocation.
- **Wrong board after root removal:** two source roots plus linked-worktree real tool calls.
- **Stale consumer configs:** reconnect and consumer-owned Git migration note.
- **Cross-platform expectation:** FRD states supported-Windows scope.
- **Governing-doc drift:** amend FRD/ADR in the same PR and review against this plan.

## Governing docs

- `docs/functional/frd/FRD-012-connect.md`: explicitly authorized by this planning request to be amended during implementation as described above.
- `docs/architecture/adr/ADR-0012-board-discovery-order.md`: consumed without changing its resolution order; add Codex Connect as a named consumer.
- A focused launcher ADR is required if the repository's doc review treats installer-owned command indirection as a new durable architecture decision. The decision itself is not open.

## Scope boundary

This remains one coherent ticket: one Codex registration needs one installed launcher contract, packaging lifecycle, provider split, and end-to-end proof. It does not implement portability for another provider, edit Pegasus, restore plugin MCP, change storage, or introduce remote MCP.
