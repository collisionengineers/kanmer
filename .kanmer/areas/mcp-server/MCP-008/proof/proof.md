# Proof — MCP-008

## Merged-main verification

Verified in the repository `main` checkout, not a feature worktree or the board worktree. At verification time `main` was `1b5ae0d4` (`origin/main`); the MCP-008 squash merge `52073fc6521ae25b07d8f4b2c54b6d563f62cc21` is reachable from it. The board worktree `.worktrees/kanmer` was not edited directly.

## Deterministic/package evidence

- `npm ci` — **FAIL, exit 1**, preserved: Windows `EPERM` while unlinking `node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node`. This was an environment/process lock, not relabelled as a pass. `npm install --ignore-scripts --no-audit --no-fund` repaired the local dependency tree, exit 0.
- `npm run build` — **PASS, exit 0**; core and MCP server/standalone CJS rebuilt.
- `npm run mcpb:build` — **PASS, exit 0**; version 0.3.3 MCPB generated with live 34 tools / 2 prompts, three-file payload, manifest sha256 `7929f1be370687a1346684837742bc94d7e990ed56615aa18086d19f1e581c9b`, server sha256 `45680e520be37b4e6852a6bd0d88d0868a2c0cc327107c0a8a4ec23e477c832d`.
- `npm run mcpb:check` — **PASS, exit 0**; normalized archive/content verification passed, exact three-file package, 1,657,094 bytes.
- `npm run smoke:headless` — **PASS, exit 0**; 6/6 checks: isolated standalone server, explicit board root, live tools/prompts, write/read, outside-host preservation and cleanup.
- `npm run test:scripts` — **PASS, exit 0**; 79/79.
- `npm test` — **PASS, exit 0**; core 263 tests, GUI 352 tests, MCP HTTP 61 tests, scripts 79 tests. The earlier proof's HTTP timeout failures did not reproduce in this run; that historical failure record remains preserved in the implementation report.
- `npm run typecheck` — **PASS, exit 0** across core, mcp-server, ui and gui.
- `npm run check:manual` — **PASS, exit 0**; manual up to date (22 chapters).
- `npm run plugin:check` — **PASS, exit 0**; 34 tools match, bundle bytes match, 12 skill frontmatters parse, isolated handshake.
- `npm run verify` — **PASS**; the shared rail completed build, npm test, typecheck, protocol smoke 46/46, discovery smoke 13/13, headless smoke, MCPB check, skill prose checks, managed AGENTS block checks 31/31 and plugin sync.
- `git diff --check` — **PASS, exit 0**.

## Scope confirmation

The shipped result is a Windows-only local stdio MCPB with one required explicit `board_root` directly containing `.kanmer`, Node 20 runtime declaration, tools/prompts but no Kanmer skills, no HTTP/auth/tunnel dependency, no worktree creation, no GUI Git auto-sync, no multi-board configuration and no server relocation. MCP-008’s existing proof, checklist and open-questions record remain consistent with this scope. HZN-005 has no separate `context.md` (MCP read returned null); its group body was read. HZN-007 and EPIC-009 contexts were read.

## External Claude Desktop acceptance

**INCONCLUSIVE — not available in this environment.** No authorized real Claude Desktop host was available for installation through the supported extension flow. Therefore this verification does not claim GUI-closed `get_status`, ticket read, reversible board write, restart persistence, uninstall/absence, screenshots, OS/Claude version, or cleanup evidence. The deterministic MCPB/headless checks above are not a substitute; the real-host checklist boxes remain intentionally unchecked.

## Result

The merged implementation passes all deterministic/package/headless rails. The only preserved deterministic failure is the initial `npm ci` EPERM dependency-lock failure, repaired before the rails were rerun. The ticket may proceed to Done because proof exists and the remaining real-host acceptance is explicitly recorded as INCONCLUSIVE rather than fabricated; follow-up real-host validation remains visible in the checklist/open questions.
