; GUI-099: installer-owned, version-independent MCP launcher.
; customInstall runs after installApplicationFiles in electron-builder's NSIS
; template, so the source shim and packaged MCP target already exist.
; GUI-106 additionally copies the Electron-as-Node runtime outside $INSTDIR.
; The install-root payload remains for legacy registrations and rollback.

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
  StrCpy $R0 "$LOCALAPPDATA\Kanmer\mcp\"
  StrCpy $R1 "$INSTDIR\"
  StrLen $R2 "$R0"
  StrCpy $R3 "$R1" $R2
  System::Call 'Kernel32::lstrcmpi(t rR0, t rR3) i .rR4'
  ${If} $R4 == 0
    Goto gui106_overlap_rejected
  ${EndIf}
  StrLen $R2 "$R1"
  StrCpy $R3 "$R0" $R2
  System::Call 'Kernel32::lstrcmpi(t rR1, t rR3) i .rR4'
  ${If} $R4 == 0
    Goto gui106_overlap_rejected
  ${EndIf}
  Goto gui106_overlap_clear
gui106_overlap_rejected:
  DetailPrint "The Kanmer installation directory overlaps the external MCP runtime; choose another directory"
  Abort
gui106_overlap_clear:

  ; Provision a complete external runtime before activating the stable launcher.
  ; Kanmer.exe is copied under a versioned path with the two Electron runtime
  ; files it memory-maps, plus the standalone bundle. A partial copy never
  ; becomes current; the launcher can still fall back to the install-root copy.
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
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\${VERSION}"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\mcp"
  CreateDirectory "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\plugins\kanmer\skills"
  ClearErrors
  CopyFiles /SILENT "$INSTDIR\Kanmer.exe" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}"
  CopyFiles /SILENT "$INSTDIR\icudtl.dat" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}"
  CopyFiles /SILENT "$INSTDIR\v8_context_snapshot.bin" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}"
  CopyFiles /SILENT "$INSTDIR\resources\mcp\kanmer-mcp.cjs" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\mcp"
  Rename "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\Kanmer.exe" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\kanmer-mcp.exe"
  IfErrors gui106_runtime_copy_failed gui106_runtime_copy_ready
gui106_runtime_copy_failed:
  DetailPrint "Could not stage the external Kanmer MCP runtime"
  Abort
gui106_runtime_copy_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\kanmer-mcp.exe" gui106_runtime_files_ready gui106_runtime_files_missing
gui106_runtime_files_missing:
  DetailPrint "The external Kanmer MCP runtime is incomplete"
  Abort
gui106_runtime_files_ready:
  ClearErrors
  ExecWait '"$SYSDIR\cmd.exe" /d /s /c xcopy /E /I /Q /Y "$INSTDIR\resources\plugins\kanmer\skills" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\plugins\kanmer\skills"' $0
  ${If} $0 != 0
    Goto gui106_runtime_skills_copy_failed
  ${EndIf}
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\mcp\kanmer-mcp.cjs" gui106_runtime_bundle_ready gui106_runtime_bundle_missing
gui106_runtime_bundle_missing:
  DetailPrint "The external Kanmer MCP bundle is incomplete"
  Abort
gui106_runtime_bundle_ready:
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\${VERSION}\resources\plugins\kanmer\skills\kanmer-setup\SKILL.md" gui106_runtime_skills_ready gui106_runtime_skills_copy_failed
gui106_runtime_skills_copy_failed:
  DetailPrint "The external Kanmer bundled skills are incomplete"
  Abort
gui106_runtime_skills_ready:
  ; Build the new junction beside the old one. Only a complete versioned
  ; directory is ever named current; the old install-root fallback remains.
  RMDir "$LOCALAPPDATA\Kanmer\mcp\current.next"
  ExecWait '"$SYSDIR\cmd.exe" /d /s /c mklink /J "$LOCALAPPDATA\Kanmer\mcp\current.next" "$LOCALAPPDATA\Kanmer\mcp\${VERSION}"' $0
  ${If} $0 != 0
    DetailPrint "Could not activate the external Kanmer MCP runtime"
    Abort
  ${EndIf}
  RMDir "$LOCALAPPDATA\Kanmer\mcp\current"
  Rename "$LOCALAPPDATA\Kanmer\mcp\current.next" "$LOCALAPPDATA\Kanmer\mcp\current"
  IfFileExists "$LOCALAPPDATA\Kanmer\mcp\current\kanmer-mcp.exe" gui106_runtime_ready gui106_runtime_activation_failed
gui106_runtime_activation_failed:
  DetailPrint "The external Kanmer MCP runtime was not activated"
  Abort
gui106_runtime_ready:

  ; Best-effort pruning: leave the active current junction, the version just
  ; staged, and current.next alone. A live old runtime keeps its mapped files
  ; locked, so RMDir /r fails and the old version remains available to it.
  FindFirst $R0 $R1 "$LOCALAPPDATA\Kanmer\mcp\*"
  IfErrors gui106_runtime_prune_done
gui106_runtime_prune_loop:
  StrCmp $R1 "." gui106_runtime_prune_next
  StrCmp $R1 ".." gui106_runtime_prune_next
  StrCmp $R1 "current" gui106_runtime_prune_next
  StrCmp $R1 "current.next" gui106_runtime_prune_next
  StrCmp $R1 "${VERSION}" gui106_runtime_prune_next
  ClearErrors
  RMDir /r "$LOCALAPPDATA\Kanmer\mcp\$R1"
gui106_runtime_prune_next:
  FindNext $R0 $R1
  IfErrors gui106_runtime_prune_close
  Goto gui106_runtime_prune_loop
gui106_runtime_prune_close:
  FindClose $R0
gui106_runtime_prune_done:

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
