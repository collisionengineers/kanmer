# Checklist — GUI-099

## Governing contract

- [x] Add the focused installer-owned launcher ADR using the next free number (expected ADR-0018).
- [x] Amend FRD-012 with fixed launcher path, HKCU ownership, probe/refusal and Windows scope.
- [x] Amend ADR-0012 to require inherited provider cwd for the launcher consumer without changing discovery order.
- [x] Link the new ADR to GUI-099 and clear `docs_todo` once it exists.
- [x] Keep GUI-100/101/102 scope explicitly out of this diff.

## Static launcher

- [x] Add `apps/gui/build/kanmer-mcp.cmd` with CRLF line endings.
- [x] Start with `@echo off` and disabled delayed expansion.
- [x] Accept no arguments or exactly `--probe`; reject everything else.
- [x] Query `HKCU\Software\Kanmer\InstallDir` with system `reg.exe`.
- [x] Reject missing, empty or malformed registry data before child launch.
- [x] Construct quoted `<InstallDir>\Kanmer.exe` path.
- [x] Construct quoted `<InstallDir>\resources\mcp\kanmer-mcp.cjs` path.
- [x] Give missing registry, executable and MCP bundle distinct deterministic failures.
- [x] Make `--probe` validate targets and exit without starting MCP.
- [x] Set `ELECTRON_RUN_AS_NODE=1` only in the wrapper's local environment.
- [x] Invoke the installed executable and MCP bundle directly.
- [x] Preserve the caller's current working directory.
- [x] Inherit stdin, stdout and stderr.
- [x] Emit no wrapper output during a successful normal launch.
- [x] Propagate the child exit code exactly.
- [x] Confirm the script contains no `cd`, `start`, PATH lookup, PowerShell/WScript, target file or arbitrary `%*` forwarding.

## NSIS lifecycle

- [x] Add `apps/gui/build/installer.nsh`.
- [x] Implement `customInstall` after installed payload availability.
- [x] Refuse/abort if the packaged source shim or target payload is incomplete.
- [x] Create `%LOCALAPPDATA%\Kanmer\bin` without recursive deletion behavior.
- [x] Copy the shim through a same-directory temporary file and final rename/replace.
- [x] Write `HKCU\Software\Kanmer\InstallDir` only after the target and shim are complete.
- [x] Make repeated install/repair/upgrade idempotent.
- [x] Implement `customUnInstall` ownership comparison against `$INSTDIR`.
- [x] Preserve the shared shim/value when an obsolete/non-owning installation uninstalls.
- [x] Remove only the fixed shim and `InstallDir` value for the owning install.
- [x] Preserve unrelated registry values, files and non-empty parent directories.
- [x] Keep per-user installation and write neither HKLM nor PATH.

## Packaging and deterministic rails

- [x] Add the shim to `electron-builder.yml` `extraFiles` at install root.
- [x] Add `nsis.include: build/installer.nsh`.
- [x] Retain the existing MCP `extraResources` mapping unchanged.
- [x] Add `scripts/kanmer-mcp-launcher.test.mjs`.
- [x] Assert exact path/key/system-reg/probe/Electron-as-Node/resource markers.
- [x] Assert no cwd change, `start`, arbitrary args or build-machine path.
- [x] Assert distinct startup errors and no marker-child execution on invalid state.
- [x] Assert normal stdout cleanliness and exact child exit propagation in a controlled Windows test.
- [x] Extend `check-updater-package.mjs` for source shim, NSIS include and MCP target.
- [x] Confirm no plugin bundle/tool-reference change is introduced.

## Installed lifecycle proof

- [x] Build with `npm run dist:check` in a controlled Windows environment.
- [x] Use a disposable user/VM or snapshot existing HKCU/shim state before testing.
- [x] Fresh-install to a custom directory.
- [x] Verify fixed LOCALAPPDATA shim bytes and HKCU selected directory.
- [x] Run `--probe` successfully.
- [x] Prove normal stdio launch preserves cwd and returns child exit code.
- [x] Upgrade/reinstall to a different custom directory.
- [x] Prove the unchanged fixed launcher resolves the new installation.
- [x] Prove failed/incomplete update leaves the previous launcher target healthy.
- [x] Prove an obsolete uninstaller cannot remove the current launcher.
- [x] Uninstall the owning installation and prove only owned state is removed.
- [x] Restore/sanitize the test user state and record cleanup.

## Documentation and verification

- [x] Update release notes without claiming GUI-100 portability is already shipped.
- [x] Run `npm run test:scripts`.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run dist:check`.
- [x] Run manual/document numbering checks.
- [x] Run `git diff --check` and inspect `git status --short`.
- [x] Record shim hash, registry/install paths, probe output, cwd, child exit and uninstall cleanup in the report.
- [x] Confirm no provider registration, `.gitignore`, remote transport or other-provider file changed.

## Stop condition

- [x] Stop with the launcher/lifecycle PR ready for independent review; do not merge or start GUI-100.

## Progress notes

Append implementation notes here; preserve the approved plan.


## Evidence notes

- Implementation is in commits 0d8c3ecf and dbbdf0fb; PR #124 is open for independent review.
- The first full npm test attempt retained a transient concurrent core-store failure: 3 ordering tests timed out/returned ENOTEMPTY (253/256 core tests passed). After cleanup and reduced load, the authoritative rerun passed: manual 22 chapters, core 256/256, GUI 337/337, HTTP 61/61, scripts 70/70 (exit 0).
- npm run typecheck, npm run dist:check, npm run check:manual, node scripts/check-doc-numbering.mjs, and git diff --check all exited 0. The updater rail passed all 8 checks; packed/source shim SHA256 is E1017FA460D5A6B9847E6008A8E2C06A74ECC80C0B09171601631CD26D7E2C41.
- Controlled Windows lifecycle evidence: fresh install and different-directory upgrade exited 0 with probe 0; packaged stdio returned valid JSON-RPC and exit 0; fake child exit 23 was propagated with caller cwd and bundle argument preserved; invalid/missing cases returned 64/65/66/67; incomplete payload installer exited 2 without shim/registry write; obsolete uninstaller preserved the current owner; owning uninstall removed only owned state and preserved unrelated file/registry values.
- Existing installed app, MCP bundle/locales, HKCU state, fixed shim, and temporary test artifacts were restored/sanitized; final baseline was shim absent, Kanmer HKCU value absent, app payload present.
