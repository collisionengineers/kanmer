# Proof — GUI-102

## Run and result

- Run id: GUI-102-20260822T192404Z-gui099.
- Result INCONCLUSIVE, not PASS. Deterministic package/registration rails passed where stated; the clean installed lifecycle was not executable safely.
- HEAD 34245be039e8fd8395b5e31835602c54e62e98a4; prerequisite merge SHAs d9379d32ffa775ab1ef957dd58ac65acb6e29fca, 3403fd86622e8223fec3e1bb691eb2e0eb960482 and c362217a43056622b7e5f3cd42bf79d91a661e81 are reachable.

## Commands and exact outcomes

- Focused Connect/provider tests: 94/94 PASS, exit 0.
- npm run typecheck: exit 0.
- npm run dist:check: exit 0; updater package 8/8.
- npm run check:manual: exit 0; 22 chapters.
- node scripts/check-doc-numbering.mjs: exit 0.
- git diff --check: exit 0; clean worktree.
- npm run verify: exit 1 after core 283/283, GUI 390/390, MCP HTTP 68/68, scripts 88/88, smoke 224/224 and typecheck passed; mcpb:check failed MODULE_NOT_FOUND for @anthropic-ai/mcpb/dist/cli/cli.js.
- Read-only unpacked shim probe: exit 65, installation missing or invalid.
- Read-only reg.exe query HKCU\Software\Kanmer /v InstallDir: exit 1, value absent.

## Package evidence

- Version 0.3.3. Installer 7858C4D764D06159153B94E48EE6A1BF700FC7F9876D68DA5CD08421E0AB8EE0; blockmap 185235DEB76D7AB41FEE120A571BEDAFE59A4615A69E3AAB3ECA9A6201BF2C97; latest.yml C86F3D06CF84280F43170D75B65CEF1E9941C6698045B5A0929A0064B482C645; shim 30BF41C55F60AA3645ADF3E795BB17AF0416285DCCD2874A474889B6E49D1CD.

## External boundary

No safe disposable user/VM/feed was available. Six existing Kanmer.exe processes were observed and left untouched; no installer, HKCU, registry, updater, project, feed, user or process state was mutated. Fresh install, live GUI Connect, real source/linked get_status, update continuity, uninstall, post-uninstall failure, reinstall and cleanup remain INCONCLUSIVE. A disposable Windows/feed lane is required; GUI-102 must not be marked Done from this evidence.
