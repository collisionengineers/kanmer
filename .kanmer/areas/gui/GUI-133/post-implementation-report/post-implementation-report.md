# Post-implementation report — GUI-133

## Outcome

Windows update and same-version repair now refuse before mutation unless all processes executing below the exact install-root boundary have stopped. The installer replaces Electron Builder 26.15.3's defective `Win32_Process.Path` predicate with the supported `customCheckAppRunning` hook and the real `ExecutablePath` field. It stages each external MCP runtime as an immutable `<version>-<installer-pid>` generation and activates `current` only after a complete Electron runtime tree, standalone MCP bundle, and installed skills exist.

## Root causes and dispositions

1. Electron Builder queried a nonexistent CIM field, so legacy install-root GUI/MCP processes survived into the old uninstaller and could leave a split installation. Fixed with an exact, case-insensitive path-boundary probe, bounded graceful/forced stop, mandatory re-probe, and fail-closed exit codes 21–23.
2. Same-version external staging reused a version-only directory. Fixed with an installer-PID generation suffix.
3. Initial external staging copied only the executable, ICU and V8 snapshot. Real launch returned Windows `0xc0000135` because Electron's sibling DLLs/resource packs were absent. Fixed by staging the complete installed Electron tree; the launcher now selects an external generation only when representative DLL/resource dependencies also exist.

## Verification

All attempts are retained:

- FAIL: the first updated invocation used the wrong argument order and hung before the custom guard; it was terminated with no file replacement.
- FAIL: silent refusal initially displayed an unbounded MessageBox; `/SD IDOK` was added.
- FAIL: an unreliable redundant PowerShell precheck returned exit 20; it was removed so the actual probe owns the result.
- FAIL: same-version staging collided with an existing version directory and exited 2; immutable generations were added.
- FAIL: the first PID binding produced `0.3.7-false`; the NSIS return binding was corrected to `i.R9`.
- FAIL: after the first apparent 0.3.8 success, a real stdio MCP start exited `0xc0000135`; the incomplete Electron runtime copy was found and corrected.
- PASS: a version-distinguishable 0.3.7 → 0.3.8 install completed with coherent executable, app.asar, registry, external runtime and GUI smoke evidence.
- PASS: the corrected 0.3.8 → 0.3.7 install completed with exit 0 and created generation `0.3.7-4568`.
- PASS: an official MCP SDK client opened the installed launcher runtime, called `get_status`, and reported packaged v0.3.7, format 3, and `repo.upToDate: true`.
- PASS: focused installer/package tests 8/8.
- PASS: `npm run dist:check`, including real NSIS compilation and all 8 packaged checks.
- PASS: core 310/310, GUI 469/469, MCP HTTP 102/102, scripts 108/108.
- PASS: all-workspace `npm run typecheck`.
- PASS: `git diff --check`.

## Files changed

- `apps/gui/build/installer.nsh`
- `apps/gui/build/kanmer-mcp.cmd`
- `scripts/check-updater-package.mjs`
- `scripts/installer-process-guard.test.mjs`
- `docs/functional/frd/FRD-021-auto-update.md`
- `AGENTS.md`

No dependency or schema changes were introduced.

## Independent review fixes

Independent review at `55a88825ae707012c007371d173ab12f2d909471` found two major issues; neither was waived.

- F-001 fixed: `--updated` is no longer treated as sufficient updater identity. The outer app-driven updater sets a process-local inheritance marker; Electron Builder's `/KEEP_APP_DATA --updated` nested uninstaller uses unattended behavior only when that marker is inherited. A direct silent replacement with four live install-root processes exited 2, left the installed executable unchanged, and kept all four processes alive.
- F-002 fixed: generation allocation probes for an existing `<version>-<pid>` path and selects the first absent bounded numeric suffix before any copy. PID reuse can no longer make `xcopy /Y` target a retained generation.

Post-fix evidence: focused tests 9/9, `dist:check` with real NSIS compilation, updater-mode install exit 0, complete external runtime, official SDK handshake through the installed launcher, core 310/310, GUI 469/469, MCP HTTP 102/102, scripts 109/109, all-workspace typecheck, and `git diff --check`.

## Second independent review fixes

The re-review at `ee3d90e8e844dd8b93d631976a5cb15306b76d7e` fixed all four new findings without waiver:

- F-003: overlap detection now canonicalizes install/runtime roots, trims and restores exactly one separator, and compares both directions in bounded PowerShell. Drive-root selection is covered.
- F-004: a Kanmer-named process with inaccessible `ExecutablePath` makes the probe inconclusive and refuses replacement.
- F-005: every PowerShell/CIM operation uses a 10-second `nsExec` timeout and nonzero/timeout results enter the fail-closed path.
- F-006: install-time pruning was removed. Prior immutable generations remain available to live sessions; uninstall alone owns recursive cleanup.

Post-fix evidence: focused tests 10/10; real NSIS `dist:check`; direct replacement exit 2 with unchanged install; updater replacement exit 0; installed SDK handshake from generation `0.3.7-1580`; core 310/310, GUI 469/469, MCP HTTP 102/102; the first script rail correctly failed one obsolete `FindFirst` assertion, which was updated to assert no eager prune; scripts then passed 110/110; all-workspace typecheck and diff check passed.

## Final independent review fixes

The review at `c6fb4ce59d937eb22cbc3cde9a237e5c22824e7f` fixed both remaining minor findings:

- F-007: the installer records its own PID in a process-local environment value and excludes it from every discovery, stop, and recheck enumeration. A real installer copy launched from inside `$INSTDIR` followed the direct cancel path (exit 2), kept all four install-root processes alive, and was removed after the test.
- F-008: FRD-012 R1d now governs the complete immutable `<version>-<installer-pid>[-<collision-index>]` tree and no install-time pruning.

Focused tests 10/10, real NSIS `dist:check`, scripts 110/110, all-workspace typecheck, and diff check pass. All seven automated review threads received explicit fixed dispositions and were resolved.
