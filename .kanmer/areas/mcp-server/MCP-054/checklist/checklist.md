# Checklist — MCP-054

- [x] Worktree `.worktrees/mcp-054` on branch `mcp-054-endpoint-registry` from `origin/main`; `take_ticket` records both; `npm ci` done.
- [x] `packages/mcp-server/src/project-registry.ts`: types, `registryLocation`, `parseRegistry`/`validateEntry`, `observeEndpoint`, `observeRegistry`, `writeRegistry`/`upsertEndpoint`; no `init()` anywhere.
- [x] `index.ts`: `inspectBoardBranch`/`inspectBoardSync`/location/legacy-identity helpers root-parameterised and reused; `get_status` output unchanged (smoke green before the new tool).
- [x] `index.ts`: `list_projects` registered (read-only, `name?` filter only), `boundProject()` exported, `get_status.compat.endpointRegistry` added, `lastProject` never set from another endpoint.
- [x] `http.ts` `HttpReadyEvent` carries `project_id`, `board_id`, `identity`; `remote-cli.ts` ready line and owner file carry `project_id`; tsup entry added.
- [x] `project-registry.test.mjs` written and added to `test:http`: location precedence, parse/validation matrix, two-fixture observation, controllers/workspaces, missing board, read never writes.
- [x] `smoke.mjs`: two named fixtures observed with distinct `project_id` and correct `bound`; cross-project `expected_project` → `WRONG_PROJECT` with both boards byte-identical; path-like inputs ignored; no tool schema accepts a path; invalid entry → `health: "invalid"`; missing registry → empty, no error.
- [x] Readiness assertions added in `http.test.mjs`, `smoke-http.mjs` (unassigned → null; logical ⇔ uuid). `remote-cli.test.mjs` unchanged — see report deviation 2.
- [x] Docs: tool-reference row + semantics; AGENTS.md count 38→39 and §8 gotcha 16; connect.md count + "Named endpoint registry" subsection; manual mirror rebuilt; `npm run verify:docs` exit 0.
- [x] [pre-review] Bundle regenerated: `npm run build && npm run plugin:build && npm run plugin:check` exit 0 (39 tools, bundle bytes match) — run in the worktree with its own `node_modules` (see report deviation 3); committed on the branch.
- [x] [pre-review] Commands run with exit codes recorded in the post-implementation report: `test:http` 0 (rerun; first run ETIMEDOUT quirk), `smoke.mjs` 290/290, `smoke:protocol` 50/50, both with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` 0, `smoke:http` 0, `smoke:remote` 0, `smoke:discovery` 0, `smoke:headless` 0, `npm test -w @kanmer/core` 0, `npm run typecheck` 0, `verify:skills` 0 (rerun), `verify-agents-block` 0, `npm run verify` 1 on the known antigravity EBUSY quirk in `test:scripts` (core 19 + GUI 50 files passed). No assertion weakened.
- [x] Post-implementation report written; PR #292 opened with `Kanmer: MCP-054` footer; `commits`/`prs` recorded; ticket moved to Review.
- [x] [pre-review] Stop at the approved boundary; do not review, merge, verify, or start another ticket.

## Progress notes

- 2026-08-27: implementation complete in `.worktrees/mcp-054`; unit 5/5, smoke 290/290 (dist and bundle), protocol 50/50, test:http green on rerun (first run: one `spawnSync node ETIMEDOUT` — known host quirk), smoke:http/remote/discovery/headless 0, core tests 0, typecheck 0, plugin:check 0 (39 tools). `npm run verify` running.
- 2026-08-27: `npm run verify` exit 1 — `test:scripts` antigravity EBUSY × 2 (known host quirk); every other rail step green individually. Report written; PR https://github.com/collisionengineers/kanmer/pull/292 head fe612e6d.
