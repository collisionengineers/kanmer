# Research — GUI-101: portable registration packaging and real-host verification

## Question

What additional packaging checks and real-host evidence are required after GUI-099 and GUI-100 so the portable Codex registration is proven against an installed application update rather than only source/unit fixtures?

## Findings

- GUI-099 is the implementation owner for `apps/gui/build/kanmer-mcp.cmd`, the NSIS include, HKCU lifecycle and basic install/upgrade/uninstall launcher proof. GUI-101 must consume that implementation rather than recreate it.
- GUI-100 is the owner of the exact `.codex/config.toml` bytes, probe-before-write, legacy drain and provider non-regression. GUI-101 freezes those bytes as the real-host test input; it does not alter Connect serialization.
- `apps/gui/electron-builder.yml` currently packages the application and MCP bundle into `win-unpacked/resources/mcp`. After GUI-099 it must also package the source shim and include the NSIS lifecycle. A source-tree assertion is insufficient: the package rail must inspect `release/win-unpacked` and installer metadata/output.
- `scripts/check-updater-package.mjs` is intentionally the packaged-output gate used by `npm run dist:check`. It already checks feed metadata, `app.asar`, updater runtime dependencies, `latest.yml`, elevation helper and MCP/plugin resources. Launcher assertions belong here because a missing shim/NSIS include would otherwise compile successfully and fail only after installation.
- The unpacked directory can prove the source shim and MCP target are present, but not that NSIS copied the shim into `%LOCALAPPDATA%`, wrote HKCU, protected newer installs from old uninstallers or refreshed the target during an update. Those require a controlled installed lifecycle.
- The meaningful user claim is not merely “the config file is unchanged.” It is: a fresh Codex host can call `get_status`; an app update stops/restarts as required; the same project registration bytes launch the new installed target; `get_status.server` changes to the new packaged build while `projectRoot`/`repoRoot` still describe the project from which Codex was launched.
- Existing updater code deliberately stops live MCP sessions before `quitAndInstall` because an installed `Kanmer.exe` child locks the installation directory. The launcher adds a parent `cmd.exe`, but the relevant child command still contains `kanmer-mcp.cjs` under the install directory. Tests and real proof must show session detection/stopping still works; do not classify arbitrary `cmd.exe` processes as Kanmer sessions.
- Automatic updates require a published prior and next version, valid `latest.yml` and release assets. A source/dev update simulation cannot establish the installed updater path. Use a disposable Windows user/VM and controlled pre-release/test repository/feed where possible; never overwrite the operator's current installation without snapshot/restore.
- To prove machine portability before the final full integration ticket, use two isolated Windows user profiles or machines with different usernames/install/source paths. Install the same package, copy the exact canonical registration bytes, trust the project, and invoke `get_status`. GUI-102 will combine fresh install/update/uninstall into the final epic proof; GUI-101 establishes the package and update continuity evidence.
- `.codex/config.toml` can be removed from `.gitignore` only after this real proof establishes it contains no local identity and works in differently located projects. The change should be narrow: unignore the file, update the explanatory comment/tests, and add an upgrade note; do not blanket-unignore `.codex/`.
- A registration already written before update must not be rewritten by the updater. Continuity is achieved because the stable command remains the same and GUI-099's installer updates HKCU/shim ownership after installing the new payload.
- Proof must bind exact installer hashes, old/new application versions, config hash, project paths, `get_status` payloads, updater logs, session-stop result, registry/shim state and cleanup. A screenshot alone is insufficient.

## Implications

- Extend the existing package rail; do not add a second packaging verifier.
- Add a focused process/session regression only if GUI-099's launcher changes the process shape observed by current tests.
- Run a controlled packaged install → register → real tool call → update → fresh host/tool call sequence with unchanged config bytes.
- After successful two-location proof, make only `.codex/config.toml` intentionally shareable and update the provider-ignore rail/docs.
- Leave final fresh-install/update/uninstall epic acceptance and migration walkthrough to GUI-102.

## Open questions

None. Environment safety, evidence fields and ownership boundaries are resolved in `open-questions.md`.
