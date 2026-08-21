# Checklist — GUI-101

## Prerequisites and environment

- [x] Confirm GUI-099 and GUI-100 are merged and their exact launcher/registration proof is available.
- [ ] Record the canonical registration SHA-256 used in every environment.
- [ ] Select two Windows environments with genuinely different user/install/repository paths.
- [ ] Select a safe old/new package and controlled update feed/path.
- [ ] Record snapshot, restore and cleanup procedures before installation.
- [x] Link GUI-099's launcher ADR and clear `docs_todo` when available.

## Packaged-output rail

- [x] Extend the existing `check-updater-package.mjs` failure collector rather than add a second verifier.
- [x] Assert `win-unpacked/kanmer-mcp.cmd` exists.
- [x] Assert exact HKCU key/value and system `reg.exe` markers.
- [x] Assert `Kanmer.exe`, `resources\mcp\kanmer-mcp.cjs`, `ELECTRON_RUN_AS_NODE=1` and `--probe` markers.
- [x] Assert no build-user/source absolute path appears in the shim.
- [x] Assert `electron-builder.yml` packages the shim with `extraFiles`.
- [x] Assert the expected NSIS include is configured.
- [x] Assert install/uninstall ownership hooks are present.
- [x] Retain every existing updater/feed/asar/elevation/MCP/plugin check.
- [x] Update check numbering/output accurately.
- [x] Add focused temporary-fixture script tests for missing/malformed launcher inputs if practical.
- [x] Prove the fixture rail does not replace a real `dist:check` run.

## Updater session compatibility

- [ ] Capture the actual parent/child process chain from a packaged launcher-started session.
- [x] Add a fixture with shim `cmd.exe`, installed `Kanmer.exe ...kanmer-mcp.cjs` child and unrelated cmd decoy.
- [x] Assert only the installed MCP child is counted/stoppable.
- [x] Preserve fail-closed updater install behavior on unknown/remaining sessions.
- [x] Modify production session detection only if real evidence requires it.

## Package build and evidence

- [x] Run build prerequisites and `npm run dist:check`.
- [x] Record old/new version, commit/tag, installer path and SHA-256.
- [x] Record `latest.yml` and package-check hashes/output.
- [ ] Confirm package contains no source checkout, username or external Node dependency.
- [ ] Run installed `--probe`, not only unpacked inspection.

## Environment A before update

- [ ] Install through normal NSIS into a custom path.
- [ ] Trust the project through Codex's supported mechanism.
- [ ] Run normal GUI Connect to write/replace the project entry.
- [ ] Assert config bytes/hash equal the canonical fixture.
- [ ] Assert config contains no environment path/identity.
- [ ] Call `get_status` from the source repo.
- [ ] Assert canonical board worktree/source root and installed baseline server identity.
- [ ] Call from a linked ticket worktree and assert the same canonical project identity.

## Real update continuity

- [ ] Record the unchanged config hash before update.
- [ ] Start a real installed MCP session and record its process chain.
- [ ] Trigger the supported updater path.
- [ ] Record session-stop, download, install and restart outcomes.
- [ ] Do not bypass an updater refusal by hand-copying/force-installing files.
- [ ] After update, assert fixed shim/HKCU resolve the new complete install.
- [ ] Assert project config bytes are unchanged.
- [ ] Start a fresh Codex host and call `get_status`.
- [ ] Assert project/board identity is unchanged.
- [ ] Assert packaged server version/path/hash advance to the new build.
- [ ] Assert no reconnect was required solely due to install location/version change.
- [ ] Confirm repair/uninstall ownership remains healthy.

## Environment B portability

- [ ] Use a different Windows user/profile, install directory and repository path.
- [ ] Install the same new package normally.
- [ ] Use/copy the exact canonical config bytes without adaptation.
- [ ] Trust the project and call `get_status` from source and linked worktree.
- [ ] Assert environment B roots are correct and server identity is installed package.
- [ ] Assert config contains neither environment A nor B paths.
- [ ] Record byte-for-byte/hash equality across environments.

## Shareability and guidance

- [ ] Only after both environments pass, remove only `.codex/config.toml` from `.gitignore`.
- [ ] Rewrite the comment to distinguish portable Codex from machine-local provider artifacts.
- [ ] Update the ignore-rule test with exactly this exception.
- [ ] Keep all other provider configs and copied skills ignored.
- [ ] Amend FRD-012 packaged/two-location/update acceptance.
- [ ] Amend FRD-021 stable-launcher/update/fresh-session behavior.
- [ ] Update release notes with the one-time reconnect/review/commit/restart migration.
- [ ] Update manual troubleshooting and regenerate it through the script.
- [x] Do not claim automatic Git migration, non-Windows support or other-provider changes.

## Verification and cleanup

- [x] Run script tests.
- [x] Run GUI and core tests.
- [x] Run root tests and typecheck.
- [x] Run `npm run dist:check`.
- [x] Run manual/document checks.
- [x] Run `git diff --check` and inspect status.
- [ ] Record package/config hashes, registry/shim state, process chain, updater logs and before/after status payloads.
- [x] Retain failed/inconclusive attempts alongside later success.
- [ ] Remove/restore test installations, users/VMs, feeds, releases, registry state and repositories.
- [x] Confirm the diff does not absorb GUI-099/100 fixes or GUI-102 final integration scope.

## Stop condition

- [ ] Stop with the packaging/real-host PR ready for independent review; do not merge or start GUI-102.

## Progress notes

Append implementation notes here; preserve the approved evidence matrix.

- GUI-101 execution evidence: `npm run dist:check` exit 0 after building packaged Windows output; extended updater package rail passed 8/8. Added dependency-free package fixture tests (4/4), retained GUI-099 launcher contract tests (4/4), and added installed-child/session-shape parser regression; focused session suite 13/13. Full `npm test` exit 0: manual fresh, core 257/257, GUI 344/344, MCP HTTP 61/61, scripts 79/79. `npm run typecheck`, `npm run check:manual`, doc numbering, and `git diff --check` exit 0. Packaged artifact hashes: installer SHA-256 75DA8A39417F56F88011DE7CDEEAF311574F23F80E5CC7226046A1DF7FAD99B3; blockmap 3ED53CDD576653F215EA54F8BBD7847B241D0646C3491CD5ED709FE841F28A5B; latest.yml 71A01B65CA11AA7736E8A1D6545437A85A65F5021970FD76321B803CF6A4952E; unpacked shim E1017FA460D5A6B9847E6008A8E2C06A74ECC80C0B09171601631CD26D7E2C41. Read-only HKCU query found no Kanmer InstallDir; direct unpacked shim `--probe` returned exit 65 (installation missing/invalid). No registry/install/update/feed mutation was performed; real installed update and two-location host proof are INCONCLUSIVE/unavailable and `.codex/config.toml` remains ignored. GUI-102 final integration is not started.
