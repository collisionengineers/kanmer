# Post-implementation report — GUI-102

## Result

**INCONCLUSIVE.** Deterministic packaged and registration contracts are green where available, but the required clean real Windows lifecycle cannot be safely run on this host. No HKCU, installer, updater, feed, process, project or user state was mutated.

## Run identity and prerequisites

- Run id: GUI-102-20260822T192404Z-gui099.
- Worktree .worktrees/gui-102; branch gui-102-portable-connect-integration; HEAD 34245be039e8fd8395b5e31835602c54e62e98a4.
- Landed prerequisite merge SHAs: GUI-099 d9379d32ffa775ab1ef957dd58ac65acb6e29fca; GUI-100 3403fd86622e8223fec3e1bb691eb2e0eb960482; GUI-101 c362217a43056622b7e5f3cd42bf79d91a661e81. All are ancestors of this HEAD.
- Package version 0.3.3. GUI-099/100 deterministic proofs PASS; GUI-101 deterministic package proof PASS, while its real installed/two-location boundary remains INCONCLUSIVE.

## Deterministic evidence

- Focused GUI Connect/provider tests: npm run test -w @kanmer/gui -- src/main/connect.test.ts src/main/providers.test.ts — exit 0, 94/94 PASS.
- npm run typecheck — exit 0 across core, mcp-server, ui and gui.
- npm run dist:check — exit 0; Windows package built and updater package check 8/8.
- npm run check:manual — exit 0; 22 chapters current.
- node scripts/check-doc-numbering.mjs — exit 0.
- git diff --check — exit 0; worktree clean.
- npm run verify — exit 1 after core 283/283, GUI 390/390, MCP HTTP 68/68, scripts 88/88, MCP smoke 224/224 and typecheck passed; mcpb:check failed because @anthropic-ai/mcpb/dist/cli/cli.js is missing (MODULE_NOT_FOUND). Failure retained, no workaround.
- Package hashes: installer 7858C4D764D06159153B94E48EE6A1BF700FC7F9876D68DA5CD08421E0AB8EE0; blockmap 185235DEB76D7AB41FEE120A571BEDAFE59A4615A69E3AAB3ECA9A6201BF2C97; latest.yml C86F3D06CF84280F43170D75B65CEF1E9941C6698045B5A0929A0064B482C645; unpacked shim 30BF41C55F60AA3645ADF3E795BB17AF0416285DCCD2874A474889B6E49D1CD.

## Read-only packaged and host census

- cmd.exe /d /c shim --probe — exit 65: installation missing or invalid.
- reg.exe query HKCU\Software\Kanmer /v InstallDir — exit 1: value absent.
- %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd — absent.
- Six existing Kanmer.exe processes observed at %LOCALAPPDATA%\Programs\Kanmer\Kanmer.exe; none were stopped or altered. This is not a clean disposable baseline.

## Missing lifecycle evidence

Fresh NSIS install, normal GUI Connect on a disposable project, installed source/linked-worktree get_status, real updater/feed transition, uninstall ownership, post-uninstall failure, reinstall recovery, two-location/migration evidence and final disposable cleanup are INCONCLUSIVE. No screenshot, registry mutation, process-chain claim or live update claim is fabricated.

## Scope and follow-up

No production source files changed and no prerequisite or GUI-101 ticket was modified. A disposable Windows user/VM with a controlled old/new package feed is required to complete acceptance; GUI-102 must not be marked Done from this evidence.
