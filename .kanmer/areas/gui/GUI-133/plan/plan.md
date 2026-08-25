# Plan — GUI-133

## Goal

Make every Windows update or direct reinstall either replace the complete Kanmer application/runtime set or refuse before mutating the installed tree. Repair the currently split v0.3.3/v0.3.7 installation and prove a real two-version cycle.

## Implementation order

1. Preserve the current split-install census and the defective generated `Win32_Process.Path` predicate as baseline evidence.
2. Add `customCheckAppRunning` in `apps/gui/build/installer.nsh`, the extension point the bundled Electron Builder template already prefers over its default.
3. In that macro, enumerate current-user `Win32_Process` rows by `ExecutablePath`; normalize the install directory with a trailing separator and compare case-insensitively so `Kanmer-old` is excluded.
4. Follow the existing installer UX: on app-driven `--updated`, allow the parent app a bounded grace period; on interactive direct reinstall, name that Kanmer is running and allow cancel. Once approved/automatic, stop matching processes gracefully, retry, then force once.
5. Re-enumerate after every stop. If PowerShell/CIM fails or any install-root PID remains, display/refuse and quit before `uninstallOldVersion`. Never proceed on an inconclusive result.
6. Do not change the external runtime/launcher activation transaction. With the old tree completely removable, `customInstall` now stages only the new executable/runtime and activates it after payload validation.
7. Add source/package contract tests that prove the override is wired, uses `ExecutablePath` rather than `Path`, applies an exact directory boundary, and has a hard remaining/error refusal. Extend `check-updater-package` so a distributable cannot omit/regress the override.
8. Update AGENTS.md and FRD-021's verified implementation note to replace the now-false description of the generated predicate.
9. Run focused tests, full GUI tests/typecheck, script tests, `dist:check`, and the authoritative verification rail.
10. On a disposable or explicitly recorded real installation, install version A, keep a controlled install-root Electron-as-Node process live, then install version B through both the updater-compatible silent route and direct reinstall route as appropriate. Prove all version-bearing/runtime files agree, no old install-root process survives, external current points at B, launcher probe succeeds, GUI boots, and uninstall/reinstall remains functional.
11. Commit, push, open a ticket-linked PR, obtain independent review, merge, and verify again at the exact merge SHA.
12. Repair the user's current split installation with the verified candidate/final installer. Distribution remains owned by [[CORE-103]].

## Stop conditions

- Do not weaken update session/unsaved-work guards.
- Do not kill processes outside the exact install directory.
- Do not proceed after failed/inconclusive process enumeration or clearance.
- Do not claim atomic replacement from static tests alone; real two-version evidence is required.
- Do not publish a release from this ticket.
