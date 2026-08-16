# Research — GUI-064: why the update installer fails with "uninstallFailed: 2"

## Question

What does `: 2` actually mean, and what held the file? The ticket asserted an
agent's MCP server holds the installed `Kanmer.exe` open. That needed proving or
killing before anything was planned around it.

## Findings

### The error path, read from source

- **The message is `uninstallFailed` + the old uninstaller's exit code.**
  `app-builder-lib/templates/nsis/include/installUtil.nsh:129` —
  `MessageBox MB_OK|MB_ICONEXCLAMATION "$(uninstallFailed): $R0"`, then
  `SetErrorLevel 2` + `Quit`. `$R0` is the `ExecWait` result from
  `:224`/`:230`. So the observed `: 2` is **the uninstaller's exit code**, not
  the installer's.
- **The installer already retries, and it is short.** `uninstallOldVersion`
  (`installUtil.nsh:213-240`) loops **5 times with `Sleep 1000`** between
  attempts, then shows `appCannotBeClosed` (`/SD IDCANCEL`) and returns with
  `$R0` still non-zero. The total tolerance for a busy file is roughly **five
  seconds**.
- **Exit code 2 is the uninstall section aborting.** Because the installer
  passes `--updated`, the uninstaller takes the `${if} ${isUpdated}` branch in
  `uninstaller.nsh:165-190`, which calls `un.atomicRMDir` — and on failure does
  exactly this:

  ```nsis
  DetailPrint "File is busy, aborting: $R0"
  Push ""
  Call un.restoreFiles
  Pop $R0
  Abort `Can't rename "$INSTDIR" to "$PLUGINSDIR\old-install".`
  ```

  `un.atomicRMDir` (`uninstaller.nsh:36-95`) **renames every file** out of
  `$INSTDIR` into `$PLUGINSDIR\old-install`, and bails on the first `Rename`
  that sets an error. So **`: 2` means precisely "one file in the install
  directory could not be renamed"**.
- **The abort is clean, and that matches the report.** `un.restoreFiles`
  (`:98-137`) moves everything back before aborting, which is why 0.3.0 still
  runs and why there is no residue: `%TEMP%` holds no `old-install` and no
  `ns*.tmp` newer than June.

### What actually blocks a rename — measured, not assumed

Ran a controlled probe (`scratchpad/rename-probe.ps1`) reproducing
`un.atomicRMDir`'s operation — `MoveFile` to another directory on the same
volume:

| Case | Result |
|---|---|
| Rename a **running `.exe` image** | **succeeded** |
| Rename a file held open by `fs.openSync` in a live node process | **succeeded** |
| Control — file with no open handle | succeeded |

**This falsifies the ticket's stated mechanism.** A running `Kanmer.exe`, and
any file our own code merely has open, rename fine — Windows permits renaming a
mapped image, and libuv opens with `FILE_SHARE_DELETE`. "The MCP server holds
`Kanmer.exe`" is not a sufficient explanation.

### What is actually locked, on the live install

`scratchpad/instdir-probe2.ps1` opens every file under `$INSTDIR` for `DELETE`
access via `CreateFileW` (read-only: no `FILE_FLAG_DELETE_ON_CLOSE`, handle
closed immediately) — the exact access `MoveFile` needs. With the app and one
agent MCP session running:

```
renameable: 111    blocked: 3
  icudtl.dat                 ERROR_SHARING_VIOLATION (32)
  v8_context_snapshot.bin    ERROR_SHARING_VIOLATION (32)
  resources\app.asar         ERROR_SHARING_VIOLATION (32)
```

Not the executable, not the DLLs — the three data files Chromium and V8
**memory-map at startup without `FILE_SHARE_DELETE`**.

> A first version of this probe reported 114/114 blocked, including a 106-byte
> JSON file. That was wrong: PowerShell bound `FileStream`'s `FileAccess`
> overload and threw before opening anything. The numbers above are from the
> corrected P/Invoke probe.

### Attribution: an MCP-server-shaped process is enough

`scratchpad/runasnode-probe.ps1`, against a **copy** of the install directory so
the real one is untouched. Baseline, then one `ELECTRON_RUN_AS_NODE=1
Kanmer.exe` child — which is exactly what `connect.ts:37,51` registers as an
agent's MCP server:

```
baseline (nothing running):                       0 blocked
while an ELECTRON_RUN_AS_NODE child is alive:     2 blocked
    icudtl.dat
    v8_context_snapshot.bin
after killing it:                                 0 blocked
```

**So the ticket's conclusion was right and its mechanism was wrong.** A lone
agent MCP server — no GUI, no window — locks ICU and the V8 snapshot against
rename, which is all `un.atomicRMDir` needs to abort. `app.asar` is the GUI's
own and is released when the app quits.

This session's process list showed the shape live: PID 34524 is
`…\Programs\Kanmer\Kanmer.exe C:\…\kanmer\plugins\…\kanmer-mcp.cjs` — the
installed binary, **not a child of the app**, so `app.quit()` does not take it
down.

### The install is staged and unapplied

`%LOCALAPPDATA%\@kanmergui-updater\pending\` holds `Kanmer-Setup-0.3.1.exe`
(78,034,599 bytes — the full installer, matching `latest.yml`; no differential,
because v0.3.0 shipped without a blockmap). Installed binary reports
`ProductVersion 0.3.0`. The update is downloaded, verified and waiting.

### What the project already believed

- `shared/mcp-sessions.ts:4-25` and FRD-021's as-built notes state the model:
  the installer kills MCP servers by path prefix, *"We cannot prevent it … so we
  name it."* The model accounts for the agent's session **dying**. It does not
  account for the install **failing**, which is what happens when the kill and
  the rename race and the rename loses.
- FRD-021 R4 — *"MCP registrations point at the installed executable path;
  updates preserve that path's validity"* — is the requirement this violates.
- FRD-021's own as-built section closes with: *"the end-to-end two-version
  install cycle has not yet been run on a real build."* This is that cycle, run
  for the first time, failing on the first try.

### Why the installer's own kill did not save it

`allowOnlyOneInstallerInstance.nsh:104-165` does kill by `$INSTDIR` path prefix
and would match the MCP server. Two gaps, in order of likelihood:

1. **Respawn.** An agent host that supervises its MCP servers restarts one that
   dies. The kill runs in `un.onInit`; `un.atomicRMDir` runs later in the
   section. A restart inside that window re-locks ICU with nobody watching.
2. **Non-forced first pass.** `KILL_PROCESS … 0` is graceful; force only comes
   on the retry (`:139-143`).

## Implications

- **The retry-and-hope options are out.** The installer already retries 5×1 s.
  Anything that merely waits is duplicating a loop that has demonstrably lost.
- **Killing the app harder does not help either** — the app is not the holder in
  the failing window. The holder is a sibling process the app does not own.
- **The fix belongs on our side of `quitAndInstall`, before the installer is
  spawned.** We already know how to find these processes (`mcpSessions()`), we
  already show them to the user, and the current wording tells them their
  sessions will be closed *by the installer* — which is exactly the thing that
  does not reliably happen. Stopping them ourselves and confirming they are gone
  turns a race we lose into a precondition we control.
- **Detection must outlive the fix.** Even with sessions stopped, an unrelated
  holder (antivirus mid-scan) can lock the same three files. `: 2` must never
  again reach a user as a bare number: the message has to name the file and the
  process. Note `un.atomicRMDir` already computes the busy path into `$R0` and
  `DetailPrint`s it — that detail is available and thrown away.
- **`installUpdateNow` is the wrong shape for a precondition.** It is documented
  as not cancellable (`updater.ts:187-198`) because `quitAndInstall` spawns the
  installer *before* `app.quit()`. Any stop-and-verify step must complete
  **before** that call, not inside it.
- The GUI's `app.asar` lock is real but benign — it goes when the app quits. It
  matters only if we ever install without quitting.

## Open questions

Carried into `open-questions.md` — the respawn question is the one that decides
whether stopping sessions is sufficient or merely necessary.
