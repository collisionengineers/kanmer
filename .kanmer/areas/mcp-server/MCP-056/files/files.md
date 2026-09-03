# Files — MCP-056

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/discover.ts` | `discoverBoardRoot` accepts any `.kanmer` entry at a level (`existsSync` only, `:87`). It must accept only a `.kanmer` **directory** that carries a board marker; a bare `~/.kanmer` holding only `endpoints.json` (the FRD-029 endpoint registry) is not a board. Breaking it means every host spawned under the home folder binds the wrong root, or no root. |
| `packages/core/src/discover.test.ts` | new cases: registry-only `.kanmer` at an ancestor is skipped and named in `tried`; a `.kanmer` FILE is skipped; each marker alone (`version.json`, `data/board.yml`, `project.json`, `areas/`, `tickets/`) counts. |
| `packages/mcp-server/src/smoke-discovery.mjs` | new case: with a decoy `<tmp>/.kanmer/endpoints.json` above an empty cwd, the server still reports `no Kanmer board found` and names the decoy as tried. |
| `packages/mcp-server/src/http.test.mjs` | "project resolution fails before binding" runs from a cwd whose parent holds a registry-only `.kanmer`, so the test proves the rule instead of assuming nothing above `os.tmpdir()` looks like a board. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | rule 1 amended: what makes a `.kanmer` a board. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | committed bundle; core compiles into it (`npm run plugin:build`). |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.ts:691-715` (`detectFormat`) | the store's own notion of a board: `version.json` is authoritative; a legacy `tickets/` folder is format 1; `areas/` without a version file is format 2; nothing at all is a fresh board that `init()` writes on first write. Discovery must accept every state a real board can be in and only those. |
| `packages/core/src/paths.ts` | `KANMER_DIR`, `WORKTREES_DIR`, `resolvePaths` (versionFile, boardFile, projectFile, areasRoot, tickets). Use the same names; do not invent a second list. |
| `packages/mcp-server/src/project-registry.ts:111-119` | the registry lives at `~/.kanmer/endpoints.json` by design (FRD-029, MCP-054); MCP-056 does not move it. |
| `packages/mcp-server/src/root.ts:35-51` | the only caller; `tried` becomes the not-found error body, so the skipped decoy must appear there with a reason. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md:60-80` | the four discovery rules this amends. |

## Ripple effects

- `get_status.rootSource` semantics unchanged; `tried` gains entries of the form `<path> (no board marker)`.
- `npm run smoke:discovery` and `test:http` exercise the new behaviour; the rail no longer needs `TMP` outside the home folder on machines with a remote-access registry.

## Out of scope

- Moving the endpoint registry (FRD-029 names its location).
- `--init` behaviour: an explicit `--init` still boots at cwd without creating `.kanmer`.
