# Checklist

- [x] Confirm exact cumulative base fcd998550714811edac99032ea7118f9b2084d38 and recorded branch/worktree: core-086-plugin-artifact-refresh / .worktrees/core-086.
- [x] Take CORE-086 through MCP without force.
- [x] Build/regenerate plugins/kanmer/mcp/kanmer-mcp.cjs from the exact cumulative tree; final plugin/standalone SHA-256 is f228352b8a965af8b96d32319a8977a10ce560a1e940bfd07120a8b20a84566c.
- [x] Confirm generated diff is limited to plugins/kanmer/mcp/kanmer-mcp.cjs (73 insertions/13 deletions vs fcd); source/parity assertions unchanged.
- [x] Re-run preservation evidence: source 26/26 PASS; core 303/303 PASS on the first run. A later core rerun recorded 301/303 with two timeout/ENOTEMPTY cleanup failures and remains preserved as INCONCLUSIVE.
- [x] Run plugin:check: final isolated-worktree rail PASS (37 tools, bundle bytes, 12 skill frontmatters, manifests, isolated handshake); initial linked-resolution refusal is preserved.
- [x] Run mcpb:check: final isolated-worktree rail PASS (3 files, 1,669,418 bytes; 37 tools/2 prompts; server SHA f228352b). Earlier CLI-unavailable and stale-artifact failures are preserved; no assertion was weakened.
- [x] Relevant rails: plugin:build/build 0; MCP typecheck 0; full verify reached build/manual/core 303/303/GUI 404/404/HTTP 94/94/scripts 88/88/typecheck/smoke rails then exited 1 at mcpb CLI absence; final scripts 88/88 and git diff --check 0.
- [x] Write post-implementation report mapping scope, SHA, rails, hosted limitations, and external proof boundaries.
- [ ] Push/open ticket-linked PR against core-026-project-declared-sources and record commit/PR traceability.
- [ ] Move Implementing→Review after a fresh get_doc_gates readback.
- [ ] Post-merge verification and proof remain unchecked for the independent merge/verify lane.
