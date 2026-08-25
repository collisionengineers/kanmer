; GUI-099: installer-owned, version-independent MCP launcher.
; customInstall runs after installApplicationFiles in electron-builder's NSIS
; template, so the source shim and packaged MCP target already exist.
; GUI-106 additionally copies the Electron-as-Node runtime outside $INSTDIR.
; The install-root payload remains for legacy registrations and rollback.

; GUI-133: electron-builder 26.0.12's default process guard queries the
; nonexistent Win32_Process.Path field. It therefore sees no install-root
; process, lets the old uninstaller begin its atomic rename, and can leave a
; mixed application tree when ICU/V8 files are mapped. The template explicitly
; prefers this supported override. Discovery and termination both use the real
; ExecutablePath field and the same trailing-separator boundary.
!macro customCheckAppRunning
  ; `--updated` is ambiguous: electron-updater supplies it to the outer
  ; installer, but electron-builder also supplies it to the nested old
  ; uninstaller for every replacement. Mark only the outer updater process;
  ; the nested uninstaller inherits that process-local environment value.
  ; A direct interactive replacement therefore keeps its notice/cancel path.
  StrCpy $R7 "interactive"
  ${If} ${isUpdated}
    ClearErrors
    ${GetOptions} $CMDLINE "/KEEP_APP_DATA" $R6
    ${If} ${Errors}
      StrCpy $R7 "updater"
      System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_UPDATER_PARENT", t "1") i.R9'
      ${If} $R9 == 0
        DetailPrint "Cannot mark the Kanmer updater process"
        SetErrorLevel 21
        Quit
      ${EndIf}
    ${Else}
      ReadEnvStr $R6 "KANMER_UPDATER_PARENT"
      ${If} $R6 == "1"
        StrCpy $R7 "updater"
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; Pass the path through the process environment, never through interpolated
  ; PowerShell source: assisted installs allow apostrophes and other shell
  ; metacharacters in $INSTDIR.
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_INSTALL_ROOT", t "$INSTDIR") i.R9'
  ${If} $R9 == 0
    DetailPrint "Cannot prepare the Kanmer process guard"
    SetErrorLevel 21
    Quit
  ${EndIf}
  System::Call 'Kernel32::GetCurrentProcessId() i.R6'
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_GUARD_PID", t "$R6") i.R9'
  ${If} $R9 == 0
    DetailPrint "Cannot identify the Kanmer installer process"
    SetErrorLevel 21
    Quit
  ${EndIf}

  ; Exit 0 = clear, 10 = matching process(es), 20 = inconclusive/error. A
  ; missing or policy-blocked PowerShell follows the same fail-closed probe
  ; path; a separate availability probe would only duplicate this execution.
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); $$unknown = @($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }); if ($$unknown.Count -gt 0) { exit 20 }; $$matches = @($$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) }); if ($$matches.Count -eq 0) { exit 0 } else { exit 10 } } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 == 0
    Goto gui133_processes_clear
  ${ElseIf} $R8 != 10
    Goto gui133_process_probe_failed
  ${EndIf}

  ${If} $R7 == "updater"
    Sleep 1000
    Goto gui133_recheck_after_grace
  ${EndIf}
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Kanmer must close before the installation can be replaced." /SD IDCANCEL IDOK gui133_stop_processes
  SetErrorLevel 2
  Quit

gui133_recheck_after_grace:
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); if (@($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }).Count -gt 0) { exit 20 }; if (@($$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) { exit 0 } else { exit 10 } } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 == 0
    Goto gui133_processes_clear
  ${ElseIf} $R8 != 10
    Goto gui133_process_probe_failed
  ${EndIf}

gui133_stop_processes:
  ; First request normal termination. A remaining process gets one forced pass;
  ; there is no retry loop that can turn a locked install into a hang.
  ; A target may exit between enumeration and Stop-Process. That result is not
  ; discarded: the mandatory re-enumeration below decides whether clearance
  ; actually converged, without misclassifying a normal exit as probe failure.
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); if (@($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }).Count -gt 0) { exit 20 }; $$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -ErrorAction SilentlyContinue }; exit 0 } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 != 0
    Goto gui133_process_probe_failed
  ${EndIf}
  Sleep 500
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); if (@($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }).Count -gt 0) { exit 20 }; if (@($$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) { exit 0 } else { exit 10 } } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 == 0
    Goto gui133_processes_clear
  ${ElseIf} $R8 != 10
    Goto gui133_process_probe_failed
  ${EndIf}

  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); if (@($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }).Count -gt 0) { exit 20 }; $$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }; exit 0 } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 != 0
    Goto gui133_process_probe_failed
  ${EndIf}
  Sleep 500
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$root = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$guardPid = [int][Environment]::GetEnvironmentVariable('KANMER_GUARD_PID'); $$all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object { $$_.ProcessId -ne $$guardPid }); if (@($$all | Where-Object { -not $$_.ExecutablePath -and $$_.Name -ieq 'Kanmer.exe' }).Count -gt 0) { exit 20 }; if (@($$all | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) { exit 0 } else { exit 10 } } catch { exit 20 }"`
  Pop $R8
  ${If} $R8 == 0
    Goto gui133_processes_clear
  ${ElseIf} $R8 == 10
    Goto gui133_processes_remain
  ${EndIf}

gui133_process_probe_failed:
  DetailPrint "Kanmer process enumeration failed; refusing partial replacement"
  MessageBox MB_OK|MB_ICONSTOP "Kanmer could not inspect the existing installation. No application files will be replaced. Close running agents and Kanmer, then try again." /SD IDOK
  SetErrorLevel 22
  Quit

gui133_processes_remain:
  DetailPrint "Existing Kanmer processes remain; refusing partial replacement"
  MessageBox MB_OK|MB_ICONSTOP "Kanmer could not safely close every process from the existing installation. No application files will be replaced. Close running agents and Kanmer, then try again." /SD IDOK
  SetErrorLevel 23
  Quit

gui133_processes_clear:
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_INSTALL_ROOT", p 0) i.R9'
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_GUARD_PID", p 0) i.R9'
!macroend

!macro customInstall
  IfFileExists "$INSTDIR\kanmer-mcp.cmd" gui099_shim_present gui099_shim_missing
gui099_shim_missing:
  DetailPrint "Kanmer launcher payload is missing; refusing incomplete install"
  Abort
gui099_shim_present:
  IfFileExists "$INSTDIR\resources\mcp\kanmer-mcp.cjs" gui099_mcp_present gui099_mcp_missing
gui099_mcp_missing:
  DetailPrint "Kanmer MCP payload is missing; refusing incomplete install"
  Abort
gui099_mcp_present:

  ; The external bundle keeps the packaged resource shape so the server can
  ; classify itself as packaged and discover the bundled skills tree.
  IfFileExists "$INSTDIR\resources\plugins\kanmer\skills\kanmer-setup\SKILL.md" gui106_skills_present gui106_skills_missing
gui106_skills_missing:
  DetailPrint "Kanmer bundled skills are missing; refusing incomplete install"
  Abort
gui106_skills_present:

  ; A selectable install directory must not contain, or contain the external
  ; runtime root. Otherwise replacing $INSTDIR could still replace the files
  ; that are meant to survive the update. Compare case-insensitively with a
  ; trailing separator so prefix lookalikes such as \Kanmer\mcp-old do not
  ; match. This is deliberately before any external staging.
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_INSTALL_ROOT", t "$INSTDIR") i.R9'
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_RUNTIME_ROOT", t "$LOCALAPPDATA\Kanmer\mcp") i.R8'
  ${If} $R9 == 0
  ${OrIf} $R8 == 0
    DetailPrint "Cannot prepare the Kanmer runtime overlap guard"
    Abort
  ${EndIf}
  nsExec::Exec /TIMEOUT=10000 `"$PowerShellPath" -NoProfile -NonInteractive -Command "try { $$install = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_INSTALL_ROOT')).TrimEnd('\') + '\'; $$runtime = [IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable('KANMER_RUNTIME_ROOT')).TrimEnd('\') + '\'; if ($$install.StartsWith($$runtime, [StringComparison]::OrdinalIgnoreCase) -or $$runtime.StartsWith($$install, [StringComparison]::OrdinalIgnoreCase)) { exit 10 } else { exit 0 } } catch { exit 20 }"`
  Pop $R4
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_INSTALL_ROOT", p 0) i.R9'
  System::Call 'Kernel32::SetEnvironmentVariable(t "KANMER_RUNTIME_ROOT", p 0) i.R9'
  ${If} $R4 == 10
    Goto gui106_overlap_rejected
  ${ElseIf} $R4 != 0
    DetailPrint "Could not inspect the Kanmer installation/runtime overlap"
    Abort
  ${EndIf}
  Goto gui106_overlap_clear
gui106_overlap_rejected:
  DetailPrint "The Kanmer installation directory overlaps the external MCP runtime; choose another directory"
  Abort
gui106_overlap_clear:

  ; Provision a complete external runtime before activating the stable launcher.
  ; Electron requires its sibling DLLs and resource packs as well as the exe;
  ; copying only the exe, ICU and V8 snapshot produces Windows 0xc0000135.
  ; Stage the complete installed tree, then give its executable the MCP name.
  IfFileExists "$INSTDIR\Kanmer.exe" gui106_runtime_exe_present gui106_runtime_exe_missing
gui106_runtime_exe_missing:
  DetailPrint "Kanmer Electron runtime is missing; refusing incomplete install"
  Abort
gui106_runtime_exe_present:
  IfFileExists "$INSTDIR\icudtl.dat" gui106_runtime_icu_present gui106_runtime_icu_missing
gui106_runtime_icu_missing:
  DetailPrint "Kanmer ICU runtime is missing; refusing incomplete install"
  Abort
gui106_runtime_icu_present:
  IfFileExists "$INSTDIR\v8_context_snapshot.bin" gui106_runtime_v8_present gui106_runtime_v8_missing
gui106_runtime_v8_missing:
  DetailPrint "Kanmer V8 runtime is missing; refusing incomplete install"
  Abort
gui106_runtime_v8_present:
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp"
  ; A version can be reinstalled and Windows can reuse process ids. Allocate
  ; the first absent generation name before copying anything; xcopy never
  ; targets an existing generation, including one held by a live session.
  System::Call 'Kernel32::GetCurrentProcessId() i.R9'
  StrCpy $R8 "${VERSION}-$R9"
  StrCpy $R7 0
gui106_runtime_allocate:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8" gui106_runtime_collision gui106_runtime_allocated
gui106_runtime_collision:
  IntOp $R7 $R7 + 1
  ${If} $R7 >= 1000
    DetailPrint "Could not allocate an immutable external Kanmer MCP runtime generation"
    Abort
  ${EndIf}
  StrCpy $R8 "${VERSION}-$R9-$R7"
  Goto gui106_runtime_allocate
gui106_runtime_allocated:
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\$R8"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\$R8\resources"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\$R8\resources\mcp"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\$R8\resources\plugins\kanmer\skills"
  ClearErrors
  ExecWait '"$SYSDIR\cmd.exe" /d /s /c xcopy /E /I /Q /Y "$INSTDIR\*" "$LOCALAPPDATA\Kanmer\mcp\$R8"' $0
  ${If} $0 != 0
    Goto gui106_runtime_copy_failed
  ${EndIf}
  Rename "$LOCALAPPDATA\Kanmer\mcp\$R8\Kanmer.exe" "$LOCALAPPDATA\Kanmer\mcp\$R8\kanmer-mcp.exe"
  IfErrors gui106_runtime_copy_failed gui106_runtime_copy_ready
gui106_runtime_copy_failed:
  DetailPrint "Could not stage the external Kanmer MCP runtime"
  Goto gui106_runtime_stage_failed
gui106_runtime_copy_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8\kanmer-mcp.exe" gui106_runtime_files_ready gui106_runtime_files_missing
gui106_runtime_files_missing:
  DetailPrint "The external Kanmer MCP runtime is incomplete"
  Goto gui106_runtime_stage_failed
gui106_runtime_files_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8\ffmpeg.dll" gui106_runtime_dll_ready gui106_runtime_files_missing
gui106_runtime_dll_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8\resources.pak" gui106_runtime_pack_ready gui106_runtime_files_missing
gui106_runtime_pack_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8\resources\mcp\kanmer-mcp.cjs" gui106_runtime_bundle_ready gui106_runtime_bundle_missing
gui106_runtime_bundle_missing:
  DetailPrint "The external Kanmer MCP bundle is incomplete"
  Goto gui106_runtime_stage_failed
gui106_runtime_bundle_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\$R8\resources\plugins\kanmer\skills\kanmer-setup\SKILL.md" gui106_runtime_skills_ready gui106_runtime_skills_copy_failed
gui106_runtime_skills_copy_failed:
  DetailPrint "The external Kanmer bundled skills are incomplete"
  Goto gui106_runtime_stage_failed
gui106_runtime_skills_ready:
  ; Build the new junction beside the old one. Only a complete versioned
  ; directory is ever named current; the old install-root fallback remains.
  RMDir "$LOCALAPPDATA\Kanmer\mcp\current.next"
  ExecWait '"$SYSDIR\cmd.exe" /d /s /c mklink /J "$LOCALAPPDATA\Kanmer\mcp\current.next" "$LOCALAPPDATA\Kanmer\mcp\$R8"' $0
  ${If} $0 != 0
    DetailPrint "Could not activate the external Kanmer MCP runtime"
    Goto gui106_runtime_stage_failed
  ${EndIf}
  RMDir "$LOCALAPPDATA\Kanmer\mcp\current"
  Rename "$LOCALAPPDATA\Kanmer\mcp\current.next" "$LOCALAPPDATA\Kanmer\mcp\current"
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\current\kanmer-mcp.exe" gui106_runtime_ready gui106_runtime_activation_failed
gui106_runtime_activation_failed:
  DetailPrint "The external Kanmer MCP runtime was not activated"
  Abort
gui106_runtime_ready:

  ; Prior immutable generations may still serve live MCP sessions. Installation
  ; never prunes them: eager recursive deletion can remove unlocked bundle and
  ; skill files beneath a process whose executable remains locked. Uninstall is
  ; the one operation that owns complete external-runtime removal.
  Goto gui106_runtime_stage_complete

gui106_runtime_stage_failed:
  ; `$R8` has not been published as current on these paths, so it is safe and
  ; necessary to remove the partial generation. Otherwise a disk-full retry
  ; allocates another suffix and strands another full-tree fragment.
  RMDir "$LOCALAPPDATA\Kanmer\mcp\current.next"
  RMDir /r "$LOCALAPPDATA\Kanmer\mcp\$R8"
  Abort
gui106_runtime_stage_complete:

  CreateDirectory "$LOCALAPPDATA\Kanmer\bin"
  Delete "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd.tmp"
  ClearErrors
  CopyFiles /SILENT "$INSTDIR\kanmer-mcp.cmd" "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd.tmp"
  IfErrors gui099_copy_failed gui099_copy_ready
gui099_copy_failed:
  DetailPrint "Could not write the Kanmer MCP launcher"
  Abort
gui099_copy_ready:
  ; Replace the old byte sequence directly: do not expose a partly copied shim
  ; (or a no-file gap) to an already configured provider.
  System::Call 'Kernel32::MoveFileEx(t "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd.tmp", t "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd", i 0x1) i .r0'
  ${If} $0 == 0
    DetailPrint "Could not activate the Kanmer MCP launcher"
    Abort
  ${EndIf}
  IfFileExists "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd" gui099_launcher_ready gui099_launcher_missing
gui099_launcher_missing:
  DetailPrint "Kanmer MCP launcher was not activated"
  Abort
gui099_launcher_ready:
  ClearErrors
  WriteRegStr HKCU "Software\Kanmer" "InstallDir" "$INSTDIR"
  IfErrors gui099_registry_failed
  Goto gui099_install_done
gui099_registry_failed:
  DetailPrint "Could not record the Kanmer installation directory"
  Abort
gui099_install_done:
!macroend

!macro customUnInstall
  ; electron-builder invokes this hook while replacing an old install. Keep
  ; the old stable launcher alive until the new customInstall has validated
  ; and activated its complete payload; otherwise a failed update leaves no
  ; working registration at all.
  ${If} ${isUpdated}
    Goto launcher_done
  ${EndIf}
  ReadRegStr $0 HKCU "Software\Kanmer" "InstallDir"
  System::Call 'Kernel32::lstrcmpi(t r0, t "$INSTDIR") i .r1'
  ${If} $0 == ""
    ${OrIf} $1 != 0
    Goto launcher_done
  ${EndIf}

  Delete "$LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd"
  DeleteRegValue HKCU "Software\Kanmer" "InstallDir"
  RMDir "$LOCALAPPDATA\Kanmer\bin"
  ; This directory is wholly installer-owned. Updates skip this cleanup so a
  ; live external session can finish on its old versioned runtime.
  RMDir /r "$LOCALAPPDATA\Kanmer\mcp"
  RMDir "$LOCALAPPDATA\Kanmer\mcp"
  RMDir "$LOCALAPPDATA\Kanmer"
launcher_done:
!macroend
