# Checklist — GUI-099

## Governing contract

- [ ] Add the focused installer-owned launcher ADR using the next free number (expected ADR-0018).
- [ ] Amend FRD-012 with fixed launcher path, HKCU ownership, probe/refusal and Windows scope.
- [ ] Amend ADR-0012 to require inherited provider cwd for the launcher consumer without changing discovery order.
- [ ] Link the new ADR to GUI-099 and clear `docs_todo` once it exists.
- [ ] Keep GUI-100/101/102 scope explicitly out of this diff.

## Static launcher

- [ ] Add `apps/gui/build/kanmer-mcp.cmd` with CRLF line endings.
- [ ] Start with `@echo off` and disabled delayed expansion.
- [ ] Accept no arguments or exactly `--probe`; reject everything else.
- [ ] Query `HKCU\Software\Kanmer\InstallDir` with system `reg.exe`.
- [ ] Reject missing, empty or malformed registry data before child launch.
- [ ] Construct quoted `<InstallDir>\Kanmer.exe` path.
- [ ] Construct quoted `<InstallDir>\resources\mcp\kanmer-mcp.cjs` path.
- [ ] Give missing registry, executable and MCP bundle distinct deterministic failures.
- [ ] Make `--probe` validate targets and exit without starting MCP.
- [ ] Set `ELECTRON_RUN_AS_NODE=1` only in the wrapper's local environment.
- [ ] Invoke the installed executable and MCP bundle directly.
- [ ] Preserve the caller's current working directory.
- [ ] Inherit stdin, stdout and stderr.
- [ ] Emit no wrapper output during a successful normal launch.
- [ ] Propagate the child exit code exactly.
- [ ] Confirm the script contains no `cd`, `start`, PATH lookup, PowerShell/WScript, target file or arbitrary `%*` forwarding.

## NSIS lifecycle

- [ ] Add `apps/gui/build/installer.nsh`.
- [ ] Implement `customInstall` after installed payload availability.
- [ ] Refuse/abort if the packaged source shim or target payload is incomplete.
- [ ] Create `%LOCALAPPDATA%\Kanmer\bin` without recursive deletion behavior.
- [ ] Copy the shim through a same-directory temporary file and final rename/replace.
- [ ] Write `HKCU\Software\Kanmer\InstallDir` only after the target and shim are complete.
- [ ] Make repeated install/repair/upgrade idempotent.
- [ ] Implement `customUnInstall` ownership comparison against `$INSTDIR`.
- [ ] Preserve the shared shim/value when an obsolete/non-owning installation uninstalls.
- [ ] Remove only the fixed shim and `InstallDir` value for the owning install.
- [ ] Preserve unrelated registry values, files and non-empty parent directories.
- [ ] Keep per-user installation and write neither HKLM nor PATH.

## Packaging and deterministic rails

- [ ] Add the shim to `electron-builder.yml` `extraFiles` at install root.
- [ ] Add `nsis.include: build/installer.nsh`.
- [ ] Retain the existing MCP `extraResources` mapping unchanged.
- [ ] Add `scripts/kanmer-mcp-launcher.test.mjs`.
- [ ] Assert exact path/key/system-reg/probe/Electron-as-Node/resource markers.
- [ ] Assert no cwd change, `start`, arbitrary args or build-machine path.
- [ ] Assert distinct startup errors and no marker-child execution on invalid state.
- [ ] Assert normal stdout cleanliness and exact child exit propagation in a controlled Windows test.
- [ ] Extend `check-updater-package.mjs` for source shim, NSIS include and MCP target.
- [ ] Confirm no plugin bundle/tool-reference change is introduced.

## Installed lifecycle proof

- [ ] Build with `npm run dist:check` in a controlled Windows environment.
- [ ] Use a disposable user/VM or snapshot existing HKCU/shim state before testing.
- [ ] Fresh-install to a custom directory.
- [ ] Verify fixed LOCALAPPDATA shim bytes and HKCU selected directory.
- [ ] Run `--probe` successfully.
- [ ] Prove normal stdio launch preserves cwd and returns child exit code.
- [ ] Upgrade/reinstall to a different custom directory.
- [ ] Prove the unchanged fixed launcher resolves the new installation.
- [ ] Prove failed/incomplete update leaves the previous launcher target healthy.
- [ ] Prove an obsolete uninstaller cannot remove the current launcher.
- [ ] Uninstall the owning installation and prove only owned state is removed.
- [ ] Restore/sanitize the test user state and record cleanup.

## Documentation and verification

- [ ] Update release notes without claiming GUI-100 portability is already shipped.
- [ ] Run `npm run test:scripts`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run dist:check`.
- [ ] Run manual/document numbering checks.
- [ ] Run `git diff --check` and inspect `git status --short`.
- [ ] Record shim hash, registry/install paths, probe output, cwd, child exit and uninstall cleanup in the report.
- [ ] Confirm no provider registration, `.gitignore`, remote transport or other-provider file changed.

## Stop condition

- [ ] Stop with the launcher/lifecycle PR ready for independent review; do not merge or start GUI-100.

## Progress notes

Append implementation notes here; preserve the approved plan.
