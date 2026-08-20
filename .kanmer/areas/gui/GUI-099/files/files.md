# Files — GUI-099

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/build/kanmer-mcp.cmd` | **Add.** Static installer-owned Windows launcher copied to `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`. It queries `HKCU\Software\Kanmer\InstallDir`, validates the installed GUI executable and bundled MCP server, preserves cwd/stdin/stdout/stderr, supports a launcher-owned `--probe`, and propagates child exit status. |
| `apps/gui/build/installer.nsh` | **Add.** electron-builder NSIS `customInstall`/`customUnInstall` hooks. Install/upgrade owns the fixed shim and HKCU value; uninstall removes them only when the recorded install directory equals the uninstalling `$INSTDIR`. |
| `scripts/kanmer-mcp-launcher.test.mjs` | **Add.** Dependency-free Windows/static contract tests for quoting, fixed paths, registry key, probe/error behavior, no cwd change, no arbitrary argument forwarding, and exact exit propagation where a controlled disposable-user test is safe. |
| `apps/gui/electron-builder.yml` | Package the source shim into the install payload with `extraFiles`; include `build/installer.nsh`; retain per-user/custom-directory NSIS settings and existing MCP `extraResources`. |
| `scripts/check-updater-package.mjs` | Extend the packaged-artifact rail to assert the install-root source shim, NSIS include wiring, fixed registry/path contract, bundled MCP target and absence of build-machine paths. This is artifact proof, not a substitute for installed lifecycle proof. |
| `docs/functional/frd/FRD-012-connect.md` | Amend the Connect contract with the stable launcher location, HKCU ownership, probe/refusal behavior, supported-Windows scope and the boundary that provider serialization is owned by GUI-100. Preserve superseded behavior as history. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Name the launcher/Codex path as a discovery consumer: the wrapper must preserve the provider's workspace cwd and must not pin the install directory as cwd. Do not change discovery precedence. |
| `docs/architecture/adr/ADR-0018-installer-owned-mcp-launcher.md` | **Add after ADR-0016/0017 land, or allocate the next free ADR number if ordering changed.** Record the durable Windows decision: fixed per-user shim + HKCU install-dir indirection, ownership/lifecycle, rejected relative/PATH/native/service alternatives and consequences. |
| `apps/gui/release-notes.md` | Describe the new launcher prerequisite and repair/reinstall behavior for the release that ships it; do not claim Codex registration portability until GUI-100/101 complete. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` §6.3 S-23 and Appendix A | The approved split and exact outcome. GUI-099 owns the installer launcher only; GUI-100 owns Codex registration; GUI-101 packaging proof; GUI-102 end-to-end. |
| `plugins/kanmer/skills/...` / authoritative `kanmer-plan` and `kanmer-research` | Scope and stop-condition discipline. Do not absorb the dependent tickets. |
| Archived `GUI-094` research/files/plan via Kanmer | Verified source contract for HKCU key, NSIS hooks, wrapper invocation and provider non-regression. Its broad plan must be split according to EPIC-011. |
| `apps/gui/electron-builder.yml` | Current NSIS target, custom install directory, per-user installation, packaged MCP bundle and build-resource layout. |
| `node_modules/app-builder-lib/templates/nsis/installSection.nsh` | Confirms `customInstall` runs after files exist, so the fixed shim can safely be copied only after the target payload is complete. Read only; never patch dependencies. |
| `node_modules/app-builder-lib/templates/nsis/uninstaller.nsh` | Confirms `customUnInstall` ordering and available `$INSTDIR` context for ownership comparison. Read only. |
| `packages/mcp-server/src/root.ts` | Board/source discovery depends on inherited cwd when no explicit root is supplied. The launcher must not `cd` to its own/install directory. |
| `packages/mcp-server/src/index.ts` and standalone bundle build | Canonical stdio entry and stdout discipline. The wrapper launches the packaged server; it does not create another tool registry. |
| `apps/gui/src/main/connect.ts` | Current installed Electron-as-Node invocation and bundle path. Read to keep the child chain compatible, but provider selection changes belong to GUI-100. |
| `apps/gui/src/main/mcp-sessions.ts` | Updater safety identifies live packaged MCP children. Inspect the process shape; modify only if real launcher proof shows the existing detector misses the child. |
| `scripts/verify-release-assets.mjs` / `scripts/check-updater-package.mjs` | Packaging and published-asset proof patterns. GUI-099 extends only the local package check. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Cwd is part of the board-discovery contract; moving cwd to the install directory would route clients to the wrong board. |
| `docs/functional/frd/FRD-021-auto-update.md` | Update/uninstall safety context. Do not alter updater behavior; prove the installer-owned shim survives the existing update mechanism. |

## Ripple effects

- GUI-100 can serialize one stable `%LOCALAPPDATA%` launcher command without knowing the selected install directory.
- Custom-directory installs and upgrades must refresh HKCU and shim bytes idempotently.
- Uninstall ownership becomes security-sensitive: an older uninstaller must not remove a newer install's shared launcher.
- Package checks gain a launcher assertion; real install/upgrade/uninstall proof must run in a controlled Windows user profile.
- The launcher starts the same packaged MCP bundle and must remain invisible to protocol stdout.
- A missing/stale launcher becomes an actionable repair/reinstall error, not an invitation to write an absolute-path fallback.
- The new ADR/FRD delta must be linked to this ticket and `docs_todo` cleared before implementation leaves Preparing.

## Out of scope

- Any edit to `.codex/config.toml`, `providers.ts`, provider merge/cleanup behavior or Connect UI serialization (GUI-100).
- Installer package assertions beyond the launcher lifecycle and real-host update continuity (GUI-101).
- End-to-end fresh-install/update/uninstall Codex session proof (GUI-102).
- POSIX launchers, PATH changes, App Execution Aliases, services, shell extensions, PowerShell/WScript wrappers or a native executable.
- Target text files, application-startup self-repair, arbitrary caller arguments, user-selected commands, network/UNC targets or source-checkout execution.
- Changing board discovery order, MCP tools, storage format, remote HTTP transport or other providers.
