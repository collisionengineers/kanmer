# Research — MCP-054 Named multi-project registry and project-bound endpoint operation

Base: `origin/main` 97dfc9f3 (includes CORE-114). Governing: FRD-029 (behaviour paragraph 3, AC4, AC5), PRD-002 req 2, ADR-0021, HZN-008 `context.md` (non-goals: no global backlog, no arbitrary request path routing).

## Question

How can several Kanmer projects be *named* and *observed* (identity, location, policy, health, board sync, active controllers/workspaces) from one place while every MCP process stays bound to exactly one project, no MCP request can select a path, and a cross-project mutation is refused structurally?

## Findings

### F1 — One process, one project is already structural (index.ts)

- `resolveRoot()` (`packages/mcp-server/src/index.ts:170-184`) reads `--root`/`KANMER_ROOT` and `--repo-root`/`KANMER_REPO_ROOT` exactly once at boot (`root.ts`) and builds one module-level `KanmerStore`. No tool schema carries a path (CORE-114 smoke asserts `root|path_root|project_root|board_root|repo_root|cwd` absent from every mutating schema).
- `assertExpectedProject()` (`index.ts:291-300`) is the single `WRONG_PROJECT` point, called by `write()` (`:551-560`), `dispatch_task`, `cancel_dispatch`, `migrate_board`; it matches `project_id` or the legacy `kanmer-proj-v1` fingerprint (`project-identity.ts` `expectedProjectMatches`).
- `lastProject` (`index.ts:193`) is the per-process snapshot that `ok()`/`guard()` decorate into `structuredContent.project`. CORE-114's report flags: a registry observation must **re-resolve per endpoint** and must not write `lastProject`.
- Implication: "structural refusal of cross-project mutation" = (a) no mutating tool accepts a registry name or path, and (b) `expected_project` of another endpoint's `project_id` is refused by the existing guard before init. The registry needs only a read surface.

### F2 — Per-root observation helpers exist but are private

- `inspectBoardBranch(root)` and `inspectBoardSync(root, branch)` (`index.ts:69-115`) take a root argument and never throw (git `symbolic-ref`, `rev-parse`, `rev-list --left-right --count`; 15 s timeouts). They are module-private; `BoardSyncState` is exported.
- `resolveLocation()` (`:259-286`) and `legacyIdentity()` (`:238-242`) close over `projectRoot`/`store`; the registry needs root-parameterised twins (or a refactor to `(root, store)` signatures used by both).
- `store.getProject()` reads `.kanmer/project.json` (core `readProjectRecord`, malformed → null). Constructing `new KanmerStore(root, { repoRoot })` is side-effect free; only `init()` writes. So a registry can observe N boards read-only with N stores.

### F3 — "Controllers and workspaces as observable now" = ticket claims

- Core `claimState(item, now, minutes)` (`packages/core/src/types.ts:627-640`) classifies `unclaimed|live|expired` from `taken_at`/`claim_expires_at`; `board.claimExpiryMinutes` (`types.ts:382`) overrides the 30-min default. Items carry `assignee`, `branch`, `worktree`, `taken_at`, `claim_expires_at`, `controller` (CORE-121 durable controller id, `types.ts:437-442`).
- Leases/batch workspaces are CORE-115 (in flight in `.worktrees/core-115`, touching core store/types/take_ticket). The registry must consume only what is exported today (`claimState`, `Item` fields) and not add core surface — overlap avoided.

### F4 — HTTP readiness and remote surfaces carry only the legacy fingerprint

- `HttpReadyEvent` (`http.ts:57-68`, `version: 1`) has `projectFingerprint` only; `start()` calls `projectFingerprint()` (`index.ts:1831-1834`).
- `remote-host.ts:53` validates `projectFingerprint` by regex and passes it to the tunnel adapter; `remote-cli.ts:34,76` writes it into the owner file and the `kanmer-mcp-remote-ready` line; `http-cli.ts:24` echoes the ready event to stdout.
- GUI `remoteAccess/manager.ts:775-796` reads `kanmer-mcp-remote-ready` and accepts it only when `projectFingerprint === record.identity.fingerprint` (fingerprint computed GUI-side by `remoteAccess/identity.ts`, byte-compatible with `kanmer-proj-v1`). Adding `project_id`/`board_id`/`identity` fields is additive and safe for that consumer; `version` can stay 1 (tests assert individual fields, not deepEqual of the whole event — `smoke-http.mjs:109-113`, `remote-host.test.mjs:37-45`, `remote-cli.test.mjs`).

### F5 — Where the GUI keeps "known projects" (for a GUI-written registry later)

- `apps/gui/src/main/settings.ts` `settings.json` under `app.getPath("userData")`: `recentProjects: string[]` (max 8), `openTabs`, per-project `Record<projectRoot, …>` maps; no per-project file. Remote access keeps its own registry `PersistedRemoteAccess { version:1, projects: Record<fingerprint, RemoteProjectRegistration>, configs }` nested under `settings.remoteAccess` (`remoteAccess/configStore.ts:57-99`) with validation (absolute paths, fingerprint↔key match, duplicate projectIds refused).
- The GUI spawns stdio MCP with `--root <boardRoot> [--repo-root <sourceRoot>]` and `KANMER_BOARD_BRANCH` (`connect.ts:110-133`); the remote host with `KANMER_ROOT`/`KANMER_REPO_ROOT` env (`manager.ts:676-773`). Multiple projects are tabs in one GUI process (single-instance lock, `index.ts:277-300`).
- Implication: the GUI already knows every fact a registry entry needs (board root, repo root, branch) and already has an atomic settings writer. The registry file contract must be simple enough for GUI-144 to write it from `settings.json` facts; this ticket ships the file contract + a writer helper, the GUI wiring is GUI-144's.

### F6 — Home-dir convention and request-path prohibition

- The server already uses `~/.kanmer/dispatch` (override `KANMER_DISPATCH_LOG_DIR`, `index.ts:526`) for operator-owned process state. A registry at `~/.kanmer/endpoints.json` with `KANMER_ENDPOINT_REGISTRY` as a spawn-time override follows the same shape: the location is decided by whoever spawns the process (operator/GUI), never by an MCP request (FRD-029 AC5, HZN-008 non-goal).
- Registry entries must be validated on read the way `configStore.ts` validates: absolute paths only, names from a closed charset, duplicate names impossible (object keys), a bad entry reported as an unhealthy endpoint rather than dropped silently.

### F7 — Tool roster and docs pins

- AGENTS.md §4 says "**38 tools**" (`:405`) and `docs/manual/connect.md:145` says "38 tools"; `scripts/check-plugin-sync.mjs` compares registered tool names against `## Read tools`/`## Write tools` tables in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` (split at `## Field semantics`). A new `list_projects` read tool → 39 everywhere plus a tool-reference row, and `plugin:build`/`plugin:check` from the main checkout (AGENTS §8 gotcha 8).
- `remoteHttpToolNames()` (`index.ts:489`) derives the remote roster from registration; `REMOTE_HTTP_EXCLUDED_TOOLS` is dispatch-only, so a read-only `list_projects` is exposed on both transports automatically. `docs/manual/connect.md` is mirrored by `scripts/build-manual.mjs` (`npm run check:manual` runs in `npm test`) — edit the source, then rebuild the manual.

### F8 — Test harnesses to extend

- `smoke.mjs` (one sandbox, one client, `KANMER_SERVER` switch) already builds copied boards for CORE-114; a second fixture root + registry file via env is a natural extension (server env is set at spawn, `:46`).
- `http.test.mjs` / `smoke-http.mjs` assert ready fields; `remote-cli.test.mjs` parses the ready line; `remote-host.test.mjs` regex-checks fingerprint. All run under `npm run test:http` (node --test on `dist`).
- `smoke-discovery.mjs` pattern (per-case cwd/env, expected failures) suits a "registry file absent / malformed / relative path" matrix if smoke.mjs gets crowded.

## Implications for this ticket

1. Ship a **file-backed named registry** (`project-registry.ts`): fixed location from spawn-time env or `~/.kanmer/endpoints.json`; schema 1 `{ schema, endpoints: { <name>: { boardRoot, repoRoot?, boardBranch?, policy? } } }`; strict validation; a pure `observeEndpoint()` that builds a throw-away read-only store per entry and reports `project` (id/board/identity/fingerprint), `location`, `boardSync`, `health`, `controllers`, `workspaces`, `policy`.
2. Ship one **read-only tool `list_projects`** (name filter only; no path input) returning the registry observation plus which entry (if any) is the endpoint this process is bound to. Mutations keep going through `write()`; nothing new can address another endpoint. AC4 is proven by two fixtures + a refused `expected_project` of the other fixture + unchanged bytes.
3. **HTTP readiness carries `project_id`** (additive on `HttpReadyEvent`; remote-cli ready line and owner file too). `lastProject` stays per-process; registry observation never touches it.
4. GUI health UI stays GUI-144; the GUI is not modified in this PR beyond nothing — the registry writer helper is exported for GUI-144.
5. Docs: tool-reference row, AGENTS.md count (+ gotcha on registry location), connect.md "Named endpoint registry" subsection + count, manual rebuild.
