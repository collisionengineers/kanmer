# Post-implementation report

## Scope and lineage

CORE-086 regenerated only the committed MCP plugin artifact required by the CORE-081 cumulative source-cache remediation. The worktree is `.worktrees/core-086`, branch `core-086-plugin-artifact-refresh`, based exactly on fcd998550714811edac99032ea7118f9b2084d38 (parents CORE-026 cumulative 3a05ab7a and CORE-085 b2c51779). No source, GUI, board, governing-document, or parity-assertion changes were made.

The final tracked diff against fcd contains only `plugins/kanmer/mcp/kanmer-mcp.cjs` (73 insertions, 13 deletions as rendered by git). The final generated plugin and fresh standalone bundle have identical SHA-256 `f228352b8a965af8b96d32319a8977a10ce560a1e940bfd07120a8b20a84566c`.

## Rails and exact outcomes

- `npm run plugin:build`: exit 0 after installing the existing lockfile dependencies into the ticket worktree; generated the artifact from the owned worktree dependency graph.
- `node --test packages/mcp-server/src/sources.test.mjs`: exit 0, 26/26.
- First `npm test -w @kanmer/core`: exit 0, 303/303. A later rerun after dependency isolation exited 1 with 301/303: two existing migration/store tests timed out at 5000 ms and reported ENOTEMPTY cleanup errors. This later failure is retained as INCONCLUSIVE/environment-sensitive and does not erase the earlier pass.
- `npm run typecheck -w @kanmer/mcp-server`: exit 0. The full verify typecheck phase completed for core, mcp-server, ui, and gui before the verify gate stopped.
- `npm run test:scripts`: exit 0, 88/88.
- `git diff --check`: exit 0.
- Initial `npm run plugin:check`: exit 1, correctly refused because the linked worktree resolved `@kanmer/core` from the parent checkout. After `npm install --ignore-scripts --no-audit --no-fund` (exit 0; existing package lock, no tracked dependency changes), final `npm run plugin:check`: exit 0 — 37 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.3, isolated handshake lists 37 tools.
- Initial `npm run mcpb:check`: exit 1 because the isolated worktree had no local `@anthropic-ai/mcpb` CLI. After installing the existing lockfile dependencies, a fresh check first exposed the pre-isolation artifact mismatch; regenerating with the owned dependency graph corrected it. Final `npm run mcpb:check`: exit 0 — manifest validation, pack/unpack parity, 3 files, 1,669,418 bytes, 37 tools/2 prompts, and MCPB server/plugin byte equality.
- Full `npm run verify`: exit 1 at its first MCPB gate because the initial worktree lacked the MCPB CLI. Before that gate, build, manual freshness, core 303/303, GUI 404/404, HTTP 94/94, scripts 88/88, all-workspace typecheck, protocol/headless smoke rails completed. The exact failure is retained; final component MCPB/plugin rails pass after isolated dependency installation.

## Hosted and external boundaries

The prior hosted PR #163 failure (run 32591279782) was the motivating artifact-parity evidence. A final hosted run for this new PR is pending and must be used by independent review; no hosted or packaged-client proof is claimed here. Local MCPB CLI/package validation is now PASS in the dedicated worktree, while packaged external-client behavior remains INCONCLUSIVE.

## Handoff

The PR will target `core-026-project-declared-sources` and use the standalone footer `Kanmer: CORE-086`. Post-merge proof is intentionally not claimed; independent review, merge, and CORE-081 cumulative re-review remain downstream.
