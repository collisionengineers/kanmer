# GUI-106 post-implementation report

## Outcome

Implemented the update-safe MCP runtime boundary without changing provider registration bytes, provider selection, board discovery, remote/tunnel behavior, MCP-015, GUI-101/102 integration, or the updater's existing live-session stop/refusal gate.

Fresh Windows installs now stage a byte-copied Electron-as-Node runtime (renamed kanmer-mcp.exe, icudtl.dat, v8_context_snapshot.bin) plus kanmer-mcp.cjs under the versioned per-user path %LOCALAPPDATA%\Kanmer\mcp\<version>\. A current junction is activated only after the staged executable and bundle are present. The fixed GUI-099 launcher still owns the registered path, preserves inherited cwd/std streams, --probe, no-argument launch, and exit propagation, prefers the complete external runtime, and falls back to the install-root payload for legacy/incomplete installations. Normal uninstall removes only the installer-owned external runtime root; update-time cleanup remains skipped so old runtime versions are not removed while an update is replacing the install.

The deterministic package/launcher rails now assert the external target, runtime prerequisites, junction activation markers, and owned cleanup. Session comments and release/governing docs distinguish legacy install-root sessions from external-runtime sessions. No provider configuration rewrite or new dependency was added.

## Traceability

- Branch/worktree: gui-106-runtime-boundary / .worktrees/gui-106
- Base: origin/main 241ff13e
- Commit/PR: to be filled after commit and push; board traceability will be updated before Review.

## Checks and exact outcomes

- node --test scripts/kanmer-mcp-launcher.test.mjs — exit 0, 4/4.
- npm run test -w @kanmer/gui -- src/shared/mcp-sessions.test.ts src/main/mcp-sessions.test.ts — exit 0, 25/25.
- npm run build -w @kanmer/gui — exit 0.
- npm run typecheck -w @kanmer/gui — exit 0.
- First npm run test:scripts on the fresh worktree — exit 1: core dist was absent and the synthetic updater fixture lacked the new external markers; this first failure is retained. After npm run build:core and the fixture marker update, npm run test:scripts — exit 0, 82/82.
- npm run test -w @kanmer/gui — exit 0, 39 files / 360 tests.
- npm run dist:check — exit 0; Windows package built and updater package check 8/8.
- npm run typecheck — exit 0 for core, mcp-server, ui, and gui.
- npm run verify — exit 1 after core 266/266 and GUI 360/360: the unrelated MCP HTTP test project resolution fails before binding and leaves no listener timed out in child node spawn (ETIMEDOUT, 60/61). This failure is preserved; no assertion was weakened.
- Final focused launcher/package checks after the marker refinement — exit 0, 8/8; git diff --check — exit 0.

## Evidence boundaries

Deterministic source, static, build, package, focused, GUI, and type rails are PASS as listed. A real installed two-version update with a live MCP session, post-update tool call, registry/process census, junction behavior on the target filesystem, AV/SmartScreen behavior, and uninstall cleanup was not available in this environment. Those packaged-host acceptance claims remain INCONCLUSIVE and are not promoted to PASS; they remain explicitly parked in open-questions and the governing notes.

## Handoff

Checklist/report are complete for the author lane. After commit/PR traceability and a fresh gate readback, the ticket will move Implementing to Review only. Author will stop for independent review and will not merge, verify, or clean up the worktree.
