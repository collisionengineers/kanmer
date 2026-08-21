# Post-implementation report — MCP-008

## Summary

Implemented the scoped headless MCPB distribution for Claude Desktop and other MCPB-capable hosts. The bundle packages the existing standalone CJS server and canonical icon, requires one explicit user-selected board root, and does not add a transport, GUI dependency, HTTP/auth/tunnel path, Git synchronization, worktree creation, multi-board support, skills, signing, or new MCP tools.

## Files and behavior

- Added committed source manifest at mcpb/manifest.json using MCPB schema 0.3, win32-only compatibility, Node >=20, and required user_config.board_root. The server args are exactly the bundle server path followed by --root and the configured board root.
- Added scripts/build-mcpb.mjs. It reads the root package version, requires the built standalone CJS and canonical GUI icon, probes the freshly-built ESM server for live tools/prompts, generates only dist/mcpb/staging, and packs exactly dist/mcpb/kanmer-<version>.mcpb with pinned local @anthropic-ai/mcpb 2.1.2.
- Added scripts/check-mcpb-sync.mjs for manifest validation, archive unpack/byte round-trip, exact file-set/unsafe-path checks, generated metadata validation, and source-manifest immutability.
- Added packages/mcp-server/src/smoke-headless.mjs, which runs the standalone CJS from a temporary host without reachable repository node_modules and verifies protocol, status, read/write, and outside-host preservation.
- Added root mcpb:build/mcpb:check and smoke:headless scripts, wired MCPB check and headless smoke into shared VERIFY_STEPS, and added release.mjs inclusion of the versioned MCPB in the existing release asset/repair flow.
- Updated FRD-022, FRD-012, and AGENTS.md; generated MCPB output remains ignored under dist/mcpb/.

## Evidence

- npm run mcpb:check — PASS. Live metadata 30 tools / 2 prompts; MCPB schema validation; 3-file archive; staging↔unpack exact bytes; output dist/mcpb/kanmer-0.3.3.mcpb (1,647,706 bytes).
- npm run smoke:headless — PASS, 6/6 checks.
- npm run plugin:check — PASS: 30 tools, bundle bytes, 12 skill frontmatters, isolated MCP handshake.
- npm run test:scripts — PASS, 75/75.
- npm run typecheck — PASS for core, mcp-server, ui, gui.
- npm run check:manual — PASS, manual up to date (22 chapters).
- npm run build — PASS; git diff --check — PASS.
- npm test — core 257/257 and GUI 343/343 passed. The MCP HTTP suite exited 1 with two environment-sensitive failures preserved verbatim rather than relabelled: src/http.test.mjs project-resolution child spawnSync ETIMEDOUT, and src/tunnels/readiness.test.mjs readiness accepted-response test TUNNEL_READINESS_TIMEOUT. These are outside the MCPB/headless change and remain visible for independent review.

## External acceptance

No Claude Desktop host is available in this lane. Real install, GUI-closed connection, reversible board write, restart, uninstall, and cleanup evidence are INCONCLUSIVE and deliberately remain unchecked in the ticket checklist. Deterministic packaging is not presented as a substitute.

## Review handoff

Branch: mcp-008-headless-mcpb. The implementation is committed and pushed; PR reference and commit SHA are recorded on the ticket after push. Author stops at Review for independent review; no merge was performed.
