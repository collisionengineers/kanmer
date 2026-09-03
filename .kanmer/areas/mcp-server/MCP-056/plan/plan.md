# Plan — MCP-056: Home-directory .kanmer (endpoint registry only) is treated as a board root

## Objective
ADR-0012 discovery binds only to a `.kanmer` directory that is a board; a registry-only `~/.kanmer` is skipped, named in `tried`, and the walk continues to its boundary.

## Starting state
`discoverBoardRoot` (`packages/core/src/discover.ts:78-125`) returns at the first level whose `.kanmer` entry `existsSync` — no directory check, no marker check. `~/.kanmer/endpoints.json` is written by `project-registry.ts:119` on first remote-access use, so on such a machine any cwd under the home folder that has no board of its own (for example `os.tmpdir()`) resolves to `~` as a board root. Observed: `http.test.mjs` "project resolution fails before binding" hung to its 30 s timeout three times during GUI-149's rail. Evidence: `files/files.md` (this ticket); `origin/main` at `cd5b6b6b`.

## Governing docs
- ADR-0012 (board discovery order): **Modifies** rule 1 with an explicit definition of "a board" — recorded in the ADR itself as an amendment dated 2026-09-03, not a new ADR (same decision, tightened predicate).
- FRD-029 (endpoint registry location): **Meets**; the registry stays where it is.

## Required changes
1. `discover.ts`: a new pure `isBoardDir(io, dir)` = `io.isDirectory(dir)` and any of `version.json`, `data/board.yml`, `board.yml`, `project.json`, `areas/`, `tickets/` exists beneath it (the same states `store.detectFormat` recognises, plus the identity file). Both probe sites (colocated and `.worktrees/*`) use it. A `.kanmer` that exists but fails the predicate is pushed to `tried` as `<path> (no board marker)`.
2. `discover.test.ts`: cases listed in `files/files.md`.
3. `smoke-discovery.mjs`: decoy-registry case.
4. `http.test.mjs`: the project-resolution test creates `<tmp>/mcp056-decoy/.kanmer/endpoints.json` and runs the child with `cwd: <tmp>/mcp056-decoy/work`.
5. ADR-0012 amendment paragraph.
6. `npm run plugin:build` (core compiles into the bundle).

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/discover.ts` | predicate + tried diagnostics |
| Modify | `packages/core/src/discover.test.ts` | new cases |
| Modify | `packages/mcp-server/src/smoke-discovery.mjs` | decoy case |
| Modify | `packages/mcp-server/src/http.test.mjs` | decoy cwd |
| Modify | `docs/architecture/adr/ADR-0012-board-discovery-order.md` | amendment |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | generated bundle |

## Do not modify
`project-registry.ts`, `root.ts`, `store.ts`, the GUI, any skill.

## Constraints
- Keep `discoverBoardRoot` pure over `DiscoverIO`; no new IO seam beyond the three that exist.
- `tried` order and existing entries stay byte-identical for the existing cases (the not-found error text is asserted by `smoke-discovery.mjs`).
- Build and `plugin:check` from a checkout with `node_modules` (gotcha 8).

## Ordered steps
1. Predicate + tried diagnostics in `discover.ts`; `npx vitest run packages/core/src/discover.test.ts` green with the new cases.
2. `smoke-discovery.mjs` decoy case; `npm run build && npm run smoke:discovery` green.
3. `http.test.mjs` decoy cwd; `npm run test:http -w @kanmer/mcp-server` green with `TMP` under the home folder.
4. ADR-0012 amendment.
5. `npm run plugin:build && npm run plugin:check`; full rail `npm run verify` **without** the TMP workaround (that is the acceptance).
6. Commit, push, PR `Kanmer: MCP-056`, post-implementation report, move to Review.

## Acceptance checks
- `npm run verify` exit 0 from the worktree with `TMP`/`TEMP` at their defaults while `~/.kanmer/endpoints.json` exists on this machine.
- `node packages/mcp-server/src/smoke-discovery.mjs` prints the decoy path with `(no board marker)` in the not-found diagnostic.

## Commands
`npx vitest run packages/core/src/discover.test.ts`; `npm run build && npm run smoke:discovery`; `npm run test:http -w @kanmer/mcp-server`; `npm run plugin:build && npm run plugin:check`; `npm run verify`.

## Failure and deviation rules
Stop and report: any existing discovery/smoke assertion that changes meaning; any need to touch `root.ts` or the registry; a bundle that differs for reasons other than `discover.ts`.

## Stop condition
PR open, report written, ticket in Review. Do not merge; do not start another ticket.
