# Post-implementation report — MCP-056

## Files changed

| Path | Change |
|---|---|
| `packages/core/src/discover.ts` | `isBoardDir(io, root)`: a `.kanmer` counts only when it is a directory carrying a marker (`version.json`, `data/board.yml`, `project.json`, `areas/`, `tickets/`, named through `resolvePaths`); both probe sites use it; a `.kanmer` that exists but is not a board is recorded in `tried` as `<path> (no board marker)` |
| `packages/core/src/discover.test.ts` | every fixture board now carries `version.json`; five new cases (registry-only ancestor skipped and named; decoy on the way to a real board; decoy inside `.worktrees/kanmer` loses to a real candidate; a `.kanmer` FILE; each marker alone counts) — 20 tests |
| `packages/mcp-server/src/smoke-discovery.mjs` | fixture board carries `version.json`; case (e): registry-only `.kanmer` above the cwd → `no Kanmer board found`, diagnostic names it as skipped |
| `packages/mcp-server/src/http.test.mjs` | the project-resolution test runs from `<tmp>/kanmer-http-decoy-*/work` beneath a registry-only `.kanmer`, so it proves the rule instead of assuming nothing above `os.tmpdir()` looks like a board |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | rule 1a (amendment 2026-09-03) |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated (core compiles into the bundle) |

## Commands and exit codes

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npx vitest run src/discover.test.ts` | `.worktrees/mcp-056/packages/core` | 0 | 20 passed |
| `npm run build` | `.worktrees/mcp-056` | 0 | core, server, standalone bundle built |
| `npm run smoke:discovery` | `.worktrees/mcp-056` | 0 | 15/15 checks incl. (e) registry-only decoy → `no Kanmer board found`, diagnostic names `….kanmer (no board marker)` |
| `npm run test:http -w @kanmer/mcp-server` (default `TMP` under the home folder, `~/.kanmer/endpoints.json` present) | `.worktrees/mcp-056` | 0 | all files pass; `project resolution fails before binding and leaves no listener` ✔ (1263 ms) from a cwd beneath a registry-only decoy |
| `npm run plugin:build && npm run plugin:check` | `.worktrees/mcp-056` | 0 | plugin-sync OK — 41 tools match, bundle bytes match (bundle regenerated for the core change) |
| `npm run verify` (default `TMP`, no workaround) | `.worktrees/mcp-056` | 0 | PASS, 13 steps (`C:kt-tmpmcp056erify1.log`), started 2026-09-03T19:36Z, default TMP |

## Deviations from the plan
None. The plan named `board.yml` at the .kanmer root as a marker; `resolvePaths` has no such legacy path, so the markers are exactly `versionFile`, `boardFile` (`data/board.yml`), `projectFile`, `areasRoot`, `tickets`.

## PR
https://github.com/collisionengineers/kanmer/pull/315 — head `acd0ae5200f1f3790b076a35474cf6963f5cdb00` (rebased onto 4d00fbfc; bundle rebuilt)
