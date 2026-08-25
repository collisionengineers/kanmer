# Research — GUI-133

## Observed installed state

The installed directory is demonstrably split:

- `Kanmer.exe`, `icudtl.dat`, `v8_context_snapshot.bin`, and `ffmpeg.dll`: timestamp 2026-08-17; executable FileVersion 0.3.3.
- `resources/app.asar`, `Uninstall Kanmer.exe`, registry DisplayName, launcher, and most resources: timestamp 2026-08-25; app package/uninstaller version 0.3.7.
- The external installer-owned runtime at `%LOCALAPPDATA%/Kanmer/mcp/0.3.7/kanmer-mcp.exe` is also FileVersion 0.3.3 because the v0.3.7 installer copied the already-split install-root executable into the versioned directory.
- Eleven legacy install-root MCP processes predate or span the attempted reinstalls. They map the old ICU/V8 runtime files.

This is a partial replacement, not a UI/version-cache issue.

## Root cause

Electron Builder 26.0.12's generated `allowOnlyOneInstallerInstance.nsh` selects install-root processes with:

`Get-CimInstance Win32_Process | ? {$_.Path -and $_.Path.StartsWith('$INSTDIR', ...)}`

`Win32_Process` exposes `ExecutablePath`, not `Path`. On this machine the predicate selects zero rows. Both the generated `FIND_PROCESS` and `KILL_PROCESS` PowerShell paths therefore report/stop nothing.

The installer then invokes the prior uninstaller. Under `--updated`, `un.atomicRMDir` moves files one by one and aborts on the first locked memory-mapped runtime file. That operation is restorative but not transactionally invisible across repeated/recovery attempts. A later install can lay down unlocked v0.3.7 resources while locked v0.3.3 runtime files survive. `customInstall` runs only after `installApplicationFiles`, so its payload-existence checks accept this mixed tree and copy the stale executable into the external `0.3.7` runtime.

The GUI's `stopMcpSessions` only covers the app-driven updater path. It cannot protect a direct installer/reinstall and cannot repair the generated NSIS predicate.

## Supported extension point

Electron Builder's official NSIS documentation supports `customCheckAppRunning` in an included script, and the bundled template conditionally uses it instead of the defective generated implementation. This is the narrow extension point: preserve the template lifecycle and UI while overriding only process discovery/termination with `ExecutablePath`.

## Correctness boundary

Before `uninstallOldVersion` runs, every current-user process whose executable is inside the exact existing `$INSTDIR\` prefix must be absent. Discovery and termination must use the same normalized, case-insensitive boundary. Prefix lookalikes must not match. Failure to enumerate or clear is a hard refusal before file mutation. The installer's own PID must not match because it runs from the download/cache path, not the install root.

After install, version agreement must be checked across the installed executable, app.asar package, uninstaller/registry, external runtime executable, launcher probe, and a real GUI boot.
