# Plan — MCP-054: Add named multi-project registry and project-bound endpoint operation

## Objective

Ship, in one PR, a file-backed named endpoint registry that several MCP processes (one per project) can read, one read-only `list_projects` tool that reports every named endpoint's identity, location, policy, health, board sync and active controllers/workspaces, and `project_id` on HTTP readiness — while no MCP request can select a path and a cross-project mutation is refused structurally (FRD-029 behaviour para 3, AC4, AC5).

## Starting state

- `origin/main` 97dfc9f3. One process ↔ one board root fixed at boot (`root.ts`, `index.ts` `resolveRoot`). `assertExpectedProject` is the single `WRONG_PROJECT` guard; `lastProject` is the per-process response snapshot. 38 tools.
- `HttpReadyEvent` carries only `projectFingerprint`; `remote-cli` ready line/owner file likewise.
- `inspectBoardBranch`/`inspectBoardSync`/`resolveLocation`/`legacyIdentity` are private in `index.ts`; `claimState` is exported from core.
- No registry exists anywhere. GUI keeps projects in `settings.json` (`recentProjects`) and a remote-access registry keyed by fingerprint; GUI is out of scope (GUI-144).
- CORE-115 is concurrently editing `packages/core` store/types/take_ticket — core is not touched here.

## Governing docs

- **FRD-029** — Meets: registry names several project-bound endpoints and reports source/board locations, policy, health, sync, controllers and workspaces (para 3); AC4 proven by two fixtures observed through their own bound endpoints plus a refused cross-project `expected_project` with the other board byte-identical; AC5 kept — registry location is spawn-time env/home-dir, `list_projects` accepts only a registry *name* filter, and the existing "no path in any tool schema" smoke is extended to the new tool. Readiness gains `project_id` ("every response identifies the logical project"). Not modified.
- **PRD-002 req 2** — Meets (multiple projects observed, no cross-project writes, no arbitrary request-selected routing per the non-goal).
- **ADR-0021** — Meets: candidate tested on disposable fixtures; live board untouched; no new stage/queue. No new ADR: the registry is a file contract under an existing FRD, not a new architectural decision.

## Required changes

1. **`packages/mcp-server/src/project-registry.ts` (new)**
   - Types: `EndpointRegistryFile { schema: 1; endpoints: Record<string, EndpointEntry> }`, `EndpointEntry { boardRoot: string; repoRoot?: string; boardBranch?: string; policy?: string }`.
   - `registryLocation(env, home)` → `{ path, source: "env" | "default" }` (`KANMER_ENDPOINT_REGISTRY` must be absolute; else `<home>/.kanmer/endpoints.json`).
   - `parseRegistry(text)` → `{ ok: true, file } | { ok: false, error }`; `validateEntry(name, entry)` → list of problems (name `^[a-z0-9][a-z0-9._-]{0,63}$`, `boardRoot` absolute, `repoRoot` absolute when present, `boardBranch` non-empty string when present, `policy` string when present). Invalid entries are kept and reported with `health: "invalid"`, never dropped; the file is never written by a read.
   - `observeEndpoint(name, entry, deps)` → `EndpointObservation { name, boardRoot, repoRoot, boardBranch, policy, health: "ok"|"unassigned"|"missing-board"|"invalid"|"error", project: {project_id, board_id, identity, origin, fingerprint} | null, location | null, boardSync | null, controllers: [{ controller, tickets: string[] }], workspaces: [{ ticket, branch, worktree, claim: "live"|"expired" }], problems: string[] }`. Uses a throw-away `new KanmerStore(boardRoot, { repoRoot })` — reads `exists()`, `detectFormat()`, `getBoardWithSource()`, `getProject()`, `listItemsWithWarnings({includeArchived:false})`; never `init()`. `deps` = `{ inspectBoardBranch, inspectBoardSync, resolveLocation }` injected so the unit test can stub git.
   - `observeRegistry(env, home, deps, bound: LogicalProject | null)` → `{ registry: { path, source, exists, error? }, endpoints: EndpointObservation[] (each with `bound: boolean` = project_id match, else fingerprint match) }`.
   - `writeRegistry(path, file)` (atomic tmp+rename, validates first) and `upsertEndpoint(path, name, entry)` — exported for GUI-144; **not** reachable from any tool.
2. **`index.ts`**: make `inspectBoardBranch`, `inspectBoardSync` and a root-parameterised `resolveLocationFor(root, repoRoot)`/`legacyIdentityFor(store, root)` reusable (export or pass as deps; existing callers unchanged). Register `list_projects` (readOnlyHint true; input `{ name?: string }` — name filter, zod strips other keys; if `name` given and absent → `ok({..., endpoints: []})` with `missing: [name]`). Result: `{ registry, bound: { project_id, board_id, fingerprint, endpoint: name|null }, endpoints }`. Handler resolves this process's project via `resolveProject()` (allowed: it is this project) and never assigns `lastProject` from another endpoint. Add `compat.endpointRegistry: "optional"` to `get_status` and mention `list_projects` in its description. Export `boundProject(): Promise<LogicalProject>` next to `projectFingerprint()`.
3. **`http.ts`**: `HttpReadyEvent` gains `project_id: string | null`, `board_id: string | null`, `identity: "logical" | "unassigned"`; `start()` resolves via `boundProject()` inside the rollback boundary (replacing the `projectFingerprint()` call, which it still derives from). `version` stays 1 (additive).
4. **`remote-cli.ts`**: owner file and `kanmer-mcp-remote-ready` line add `project_id` (from `boundProject()`); `remote-host.ts` unchanged except passing through (regex on fingerprint stays).
5. **`tsup.config.ts`**: add `src/project-registry.ts` entry.
6. **Tests**: `project-registry.test.mjs` (added to `test:http`), `smoke.mjs` AC4/AC5 block, ready-field assertions in `http.test.mjs`/`smoke-http.mjs`/`remote-cli.test.mjs`.
7. **Docs**: tool-reference row for `list_projects` + registry field semantics; AGENTS.md 38→39 + §8 gotcha (registry is spawn-time only; `~/.kanmer/endpoints.json`); connect.md 38→39 + "Named endpoint registry" subsection; rebuild manual mirror; regenerate plugin bundle from main checkout.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Add | `packages/mcp-server/src/project-registry.ts` | registry contract, validation, observation, writer helper |
| Add | `packages/mcp-server/src/project-registry.test.mjs` | unit tests against `dist/project-registry.js` |
| Modify | `packages/mcp-server/src/index.ts` | helpers reusable, `list_projects`, `boundProject`, `get_status.compat` |
| Modify | `packages/mcp-server/src/http.ts` | readiness `project_id`/`board_id`/`identity` |
| Modify | `packages/mcp-server/src/remote-cli.ts` | ready line/owner file `project_id` |
| Modify | `packages/mcp-server/tsup.config.ts`, `package.json` | build entry, test list |
| Modify | `packages/mcp-server/src/smoke.mjs`, `smoke-http.mjs`, `http.test.mjs`, `remote-cli.test.mjs` | assertions |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | new row + semantics |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` (+ any setup runtime artefact `plugin:build` emits) | committed build artifact, built from main checkout |
| Modify | `AGENTS.md`, `docs/manual/connect.md` (+ generated manual mirror via `scripts/build-manual.mjs`) | counts, registry docs |

## Do not modify

- `packages/core/**` (CORE-115 lane), `apps/gui/**` (GUI-144), `.worktrees/kanmer` (live board), `project-identity.ts` `projectIdentity` payload bytes, `remote-host.ts` fingerprint validation, any governing doc, `REMOTE_HTTP_EXCLUDED_TOOLS`.
- No mutating tool gains a registry/name/path argument. No tool writes the registry.

## Constraints

- Board files must stay readable by installed v0.3.12 (no board file is touched by this change).
- `plugin:check` byte-compares the bundle: build from the main checkout after merging nothing else; no timestamps in source.
- Registry reads must be bounded: git probes reuse the 15 s timeouts; N endpoints observed with `Promise.all`; a failing endpoint yields `health: "error"` with `problems`, never a thrown tool error.
- Never weaken an existing assertion.
- Host quirks (antigravity EBUSY in `test:scripts`, kanmerGit orphan-cleanup, core 5 s timeouts, http spawn ETIMEDOUT) are recorded, not chased; hosted verify is authoritative.

## Ordered steps

1. `git fetch origin`; `git worktree add .worktrees/mcp-054 -b mcp-054-endpoint-registry origin/main`; `take_ticket` with that branch/worktree; `npm ci` in the worktree.
2. Write `project-registry.ts` (types, location, parse/validate, observe, write helpers). Expected: `npm run typecheck -w @kanmer/mcp-server` clean.
3. Refactor `index.ts` helpers to root-parameterised forms; keep `get_status` output identical (smoke 278/278 still green before adding the tool).
4. Register `list_projects`; export `boundProject()`; add `compat.endpointRegistry`.
5. `http.ts` readiness fields; `remote-cli.ts` ready/owner fields; tsup entry.
6. `project-registry.test.mjs`: location precedence (env absolute / env relative → error / default), parse matrix (missing file → exists:false, malformed JSON, wrong schema, bad name, relative path), observation of two fixture boards (fixture A migrated with `project.json`, fixture B legacy → `unassigned`), controllers/workspaces from a taken ticket (live vs expired via `claim_expires_at`), missing board dir → `missing-board`, no file written by any read (dir snapshot equal). Add to `test:http`.
7. `smoke.mjs`: create fixtures A (the smoke sandbox itself) and B (second temp board with a ticket taken by `controller:other`), write `KANMER_ENDPOINT_REGISTRY` file **before** spawning the server (env is read at call time, so write the file then call the tool); checks: `list_projects` lists `alpha`+`beta`, distinct `project_id`s, `bound` only on the served one, B's controllers/workspaces visible; `update_item` on a sandbox ticket with `expected_project` = B's `project_id` → `WRONG_PROJECT`, B's ticket bytes and A's ticket bytes unchanged; `list_projects({ boardRoot: B })`/`{ root }` returns the same registry view (input ignored, no path routing); `list_projects` schema has no path property (extend the existing no-path-schema assertion to all tools); invalid entry (relative path) reported `health: "invalid"`; registry file missing → `registry.exists=false`, `endpoints=[]`, no error.
8. Readiness assertions: `http.test.mjs` and `smoke-http.mjs` (`project_id` null on unassigned root, `identity: "unassigned"`; after one write through a stdio server on the same root, a new host reports the uuid), `remote-cli.test.mjs` ready line has `project_id` key.
9. Docs: tool-reference, AGENTS.md, connect.md; `node scripts/build-manual.mjs`; `npm run verify:docs`.
10. From the **main checkout** (after committing on the branch and checking it out there, or by running against the worktree's committed tree as CORE-114 did with its own `node_modules`): `npm run build && npm run plugin:build && npm run plugin:check`; commit the regenerated bundle on the branch.
11. Full rail: `npm run verify` (record known-quirk failures individually), then `npm test -w @kanmer/core`, both smokes with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`, `npm run typecheck`, `npm run test:http -w @kanmer/mcp-server`, `smoke:http`, `smoke:remote`, `smoke:discovery`, `smoke:headless`, `verify:skills`, `verify:agents-block`.
12. Write the post-implementation report; push; `gh pr create` with `Kanmer: MCP-054` footer; `update_item` prs; `move_item review`.

## Acceptance checks

- Production registration: `list_projects` registered in `createKanmerMcpServer` for both policies; `remoteHttpToolNames()` includes it; tool-reference lists it; `plugin:check` passes with 39 tools.
- Runtime deps ship: registry module is bundled into `kanmer-mcp.cjs` (standalone build has no external deps) — smoke against `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` exercises `list_projects`.
- No schema change on the board; no migration.
- Tests prove AC4/AC5 without weakened assertions; commands and exit codes recorded in the report.

## Commands

- Worktree `.worktrees/mcp-054`: `npm ci`; `npm run build -w @kanmer/mcp-server`; `npm run typecheck`; `npm run test:http -w @kanmer/mcp-server`; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`; `npm run smoke:http`; `npm run smoke:remote`; `npm run smoke:discovery`; `npm run smoke:headless`; `npm test -w @kanmer/core`; `npm run verify:docs`; `npm run verify:skills`; `node scripts/verify-agents-block.mjs`; `npm run verify` (log to a unique path under `%TEMP%`).
- Main checkout (bundle only): `npm run build && npm run plugin:build && npm run plugin:check`.

## Failure and deviation rules

Stop and report if: a core or GUI file must change; CORE-115 lands a conflicting claim-field change before PR; `plugin:check` cannot pass from the main checkout because of unrelated uncommitted edits (record exactly what was done instead, as CORE-114 did); any existing assertion would need weakening; a new dependency is needed. Host quirks are recorded in the report with the exact failing test, not fixed here.

## Stop condition

PR open against `main` with the `Kanmer: MCP-054` footer, ticket in Review with the post-implementation report written. No review, merge, verify, closeout, release, or other ticket.
