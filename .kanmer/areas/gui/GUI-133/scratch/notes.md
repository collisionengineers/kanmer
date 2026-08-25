## GUI-133 implementation checkpoint

Root cause confirmed in the installed tree and Electron Builder 26.15.3 template: the generated process guard uses nonexistent Win32_Process.Path, so install-root processes are missed. The installed app is mixed (v0.3.3 executable/runtime; v0.3.7 app.asar/uninstaller/registry), and the external 0.3.7 MCP runtime copied the stale v0.3.3 executable.

Implemented the supported customCheckAppRunning override using ExecutablePath, environment-passed install root, exact trailing-separator/case-insensitive boundary, bounded clear/recheck, and fail-closed refusal before uninstall. Updated package gate, regression test, AGENTS, and FRD-021.

Exit-0 evidence before real install:
- focused installer/package tests 6/6
- dist:check, including real NSIS compile and 8 packaged checks
- core 310/310
- GUI 469/469
- MCP HTTP 102/102
- scripts 106/106
- all-workspace typecheck
- git diff --check

Next destructive-but-authorized step: use the built installer with --updated to repair the real split installation. This will intentionally terminate processes executing from the install root, including the current legacy MCP session; the portable external registration should respawn from the activated versioned runtime.
