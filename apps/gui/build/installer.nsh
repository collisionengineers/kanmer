; GUI-099: installer-owned, version-independent MCP launcher.
; customInstall runs after installApplicationFiles in electron-builder's NSIS
; template, so the source shim and packaged MCP target already exist.

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
  RMDir "$LOCALAPPDATA\Kanmer"
launcher_done:
!macroend
