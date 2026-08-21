@echo off
setlocal DisableDelayedExpansion

rem Installer-owned Windows MCP launcher. It intentionally inherits the caller's
rem cwd and stdio: ADR-0012 discovery starts from the provider workspace.
rem Only --probe is accepted for health checks; provider arguments are never
rem forwarded into the Electron-as-Node process.

if "%~1"=="" if "%~2"=="" goto :launch
if /I "%~1"=="--probe" if "%~2"=="" goto :probe
>&2 echo Kanmer MCP launcher: invalid arguments. Use no arguments or --probe.
exit /b 64

:resolve
set "INSTALL_DIR="
if not exist "%SystemRoot%\System32\reg.exe" (
  >&2 echo Kanmer MCP launcher: the system registry tool is missing.
  exit /b 65
)
for /f "tokens=1,2,*" %%A in ('%SystemRoot%\System32\reg.exe query "HKCU\Software\Kanmer" /v "InstallDir" 2^>nul') do (
  if /I "%%A"=="InstallDir" if /I "%%B"=="REG_SZ" if not defined INSTALL_DIR set "INSTALL_DIR=%%C"
)
if not defined INSTALL_DIR (
  >&2 echo Kanmer MCP launcher: installation is missing or invalid. Repair or reinstall Kanmer.
  exit /b 65
)
rem Only a drive-rooted local path is accepted. Quoted, UNC, relative and
rem trailing-space/period registry values are rejected before any child starts.
if not "%INSTALL_DIR:~1,2%"==":\" goto :invalid_install
if "%INSTALL_DIR:~0,1%"=="\" goto :invalid_install
if not "%INSTALL_DIR:"=%"=="%INSTALL_DIR%" goto :invalid_install
if "%INSTALL_DIR:~-1%"==" " goto :invalid_install
if "%INSTALL_DIR:~-1%"=="." goto :invalid_install
set "KANMER_EXE=%INSTALL_DIR%\Kanmer.exe"
set "MCP_BUNDLE=%INSTALL_DIR%\resources\mcp\kanmer-mcp.cjs"
if not exist "%KANMER_EXE%" (
  >&2 echo Kanmer MCP launcher: Kanmer.exe is missing. Repair or reinstall Kanmer.
  exit /b 66
)
if not exist "%MCP_BUNDLE%" (
  >&2 echo Kanmer MCP launcher: the bundled MCP server is missing. Repair or reinstall Kanmer.
  exit /b 67
)
exit /b 0

:invalid_install
>&2 echo Kanmer MCP launcher: installation registry value is malformed. Repair or reinstall Kanmer.
exit /b 65

:probe
call :resolve
if errorlevel 1 exit /b %ERRORLEVEL%
echo Kanmer MCP launcher: healthy
exit /b 0

:launch
call :resolve
if errorlevel 1 exit /b %ERRORLEVEL%
set "ELECTRON_RUN_AS_NODE=1"
"%KANMER_EXE%" "%MCP_BUNDLE%"
set "CHILD_EXIT=%ERRORLEVEL%"
endlocal & exit /b %CHILD_EXIT%
