# Post-implementation report — MCP-054

Branch `mcp-054-endpoint-registry`, worktree `.worktrees/mcp-054`, head `fe612e6d3d1c6fdcbdb54b439d5bd1eded6f03dc` (from `origin/main` 97dfc9f3). One commit. PR https://github.com/collisionengineers/kanmer/pull/292.

## Files changed and why

| File | Why |
| --- | --- |
| `packages/mcp-server/src/project-registry.ts` (new) | Registry contract (`schema: 1`, `endpoints: { <name>: { boardRoot, repoRoot?, boardBranch?, policy? } }`), `registryLocation` (`KANMER_ENDPOINT_REGISTRY` absolute, else `~/.kanmer/endpoints.json`), `parseRegistry`, `validateEntry` (name `^[a-z0-9][a-z0-9._-]{0,63}$`, absolute paths), `readRegistry`, `observeEndpoint` (throw-away read-only `KanmerStore`; never `init()`; health `ok`/`unassigned`/`missing-board`/`invalid`/`error`; project, location, boardSync, controllers/workspaces from `claimState`), `endpointMatches` (id first, fingerprint fallback), `observeRegistry` (name filter, `missing`), `writeRegistry`/`upsertEndpoint` (atomic, validated; for GUI-144, not an MCP surface). |
| `packages/mcp-server/src/index.ts` | `resolveLocation` split into root-parameterised `resolveLocationFor`; `registryObservationDeps` reuses the private `inspectBoardBranch`/`inspectBoardSync`; new read-only `list_projects` tool (`name?` only); `get_status.compat.endpointRegistry: "optional"` + description; exported `boundProject()`. `lastProject` is only ever set from this process's own `resolveProject()`. |
| `packages/mcp-server/src/http.ts` | `HttpReadyEvent` gains `project_id`, `board_id`, `identity` (additive; `version: 1`); `start()` resolves `boundProject()` inside the rollback boundary. |
| `packages/mcp-server/src/remote-cli.ts` | Owner file gains `project_id`; `kanmer-mcp-remote-ready` gains `project_id`/`board_id`/`identity`. |
| `packages/mcp-server/tsup.config.ts`, `package.json` | `project-registry` build entry; new test in `test:http`. |
| `packages/mcp-server/src/project-registry.test.mjs` (new) | 5 tests: location precedence; parse/validation matrix; two fixture boards (logical + legacy) with live/expired claims, bound matching, missing board, invalid entry, branch drift, directory snapshot unchanged after every read; registry file missing/malformed/filtered; atomic writer refuses invalid input and never overwrites a malformed file. |
| `packages/mcp-server/src/smoke.mjs` | 38 → 39; +11 FRD-029 AC4/AC5 checks with a second fixture served by its own stdio process (see Verification). |
| `packages/mcp-server/src/smoke-protocol.mjs` | 38 → 39 on every protocol version. |
| `packages/mcp-server/src/http.test.mjs`, `smoke-http.mjs` | Readiness `project_id`/`board_id`/`identity` assertions; `smoke-http` tool-count literal replaced with the derived `remoteHttpToolNames()` roster (deviation 1). |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `list_projects` row with the full result shape and the cross-project rule. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundle (`plugin:check` OK, 39 tools, bytes match). |
| `AGENTS.md` | §4 tool count 39; §8 gotcha 16 (registry is spawn-time configuration; no path field on any tool; writer helpers not for MCP; readiness fields additive). |
| `docs/manual/connect.md` + `apps/gui/src/renderer/src/manual/chapters.generated.ts` | 39 tools; "Named endpoint registry" subsection; regenerated mirror (`check:manual` 0). |

## Governing docs

- **FRD-029** — Meets. Para 3: one process ↔ one project (root fixed at boot, unchanged); registry names several endpoints and reports source/board locations, policy, health, sync, controllers and workspaces; cross-project operations observational only. **AC4**: smoke runs two fixtures through their own stdio processes, each lists both with distinct `project_id`s and marks only itself `bound`; `update_item` with the other project's id is `WRONG_PROJECT` on both endpoints with both ticket files byte-identical. **AC5**: registry location from env/home only; `list_projects` accepts a name filter only and ignores path-like keys (smoke); the no-path-schema check now covers **every** tool. GUI boundary unchanged (GUI-144). Not modified.
- **PRD-002 req 2** — Meets. **ADR-0021** — Meets (disposable fixtures only; live board untouched; no stage/queue added). No new ADR.

## Verification (cwd `.worktrees/mcp-054`, head fe612e6d)

| Command | Exit |
| --- | --- |
| `npm run typecheck` (all 4 workspaces) | 0 |
| `node --test src/project-registry.test.mjs` — 5/5 | 0 |
| `node packages/mcp-server/src/smoke.mjs` — 290/290 | 0 |
| `npm run smoke:protocol` — 50/50 | 0 |
| `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` × smoke.mjs 290/290, smoke-protocol 50/50 | 0, 0 |
| `npm run test:http -w @kanmer/mcp-server` | first run **1** — `http.test.mjs` "project resolution fails before binding" `spawnSync node ETIMEDOUT` (known host quirk, recorded); rerun **0** |
| `npm run smoke:http` | first run **1** on the pre-existing stale count (30 vs 35; deviation 1); after the fix **0** |
| `npm run smoke:remote`, `smoke:discovery` (13/13), `smoke:headless` | 0, 0, 0 |
| `npm test -w @kanmer/core` — 19 files | 0 |
| `node scripts/build-manual.mjs`, `npm run check:manual`, `npm run verify:docs`, `node scripts/verify-agents-block.mjs` | 0 each |
| `npm run verify:skills` | first run **1** — check 5 misread `kanmer-loc-v1` in the new tool-reference prose as skill `kanmer-lo` (same checker quirk CORE-114 hit); token removed, rerun **0** |
| `npm run build && npm run plugin:build && npm run plugin:check` — 39 tools match, bundle bytes match | 0 |
| `npm run verify` (log `%TEMP%/mcp-054-verify.log`) | **1** — build 0; `npm test`: check:manual 0, core 19 files passed, GUI 50 files passed, `test:scripts` failed on `antigravity-plugin-config.test.mjs` × 2 with `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin` (known host quirk, recorded not chased); the rail aborted there and every later step was run individually above. Hosted `verify` is authoritative. |

## Deviations

1. `smoke-http.mjs` asserted `tools.length === 30`; it had been stale (server exposed 35 remotely) since 0a484ce4 (2026-08-21) and `smoke:http` is not in the verify rail, so it failed before this ticket too. Replaced with a stronger check: names deep-equal `remoteHttpToolNames()` and the roster includes `list_projects` but not `dispatch_task`.
2. Plan step 8 named `remote-cli.test.mjs` for the ready line; that file only tests argv refusal (the CLI needs a fake cloudflared to reach readiness), so no assertion was added there. The ready-line and owner-file fields come from the same `boundProject()` the HTTP host uses, which `http.test.mjs`/`smoke-http.mjs` assert.
3. `plugin:build`/`plugin:check` ran inside the worktree (its own `node_modules` from `npm ci`), as CORE-114 did; the main checkout carries unrelated uncommitted edits (`AGENTS.md`, `pr.yml`) and was not used. `plugin:check` passed there (39 tools, bytes match).
4. Unit/smoke fixtures take tickets with `profile: "chore"` and `stage: "backlog"` so the claim exists without crossing a doc gate — the registry reports claims, it does not care about stage.
5. `AGENTS.md` §4 tree comment at line 205 still says "20 tools" (pre-existing, unrelated to the roster count at §4 line 405, which was updated). Left alone.

## Risks / follow-ups

- Registry observation runs git probes per endpoint (15 s timeouts each, `Promise.all`); a large registry over slow disks makes `list_projects` slow, never failing. Consider a bound on endpoint count if GUI-144 polls it.
- `workspaces` uses `claim_controller || assignee`; CORE-115 leases may add fields — the view should follow in GUI-144/CORE-115 follow-ups, not here.
- The registry writer is exported but unwired; GUI-144 should write it from `settings.json` facts (recent projects / board roots) rather than defining a second shape.
- Parked (open-questions): per-endpoint HTTP/tunnel liveness; whether the registry should live inside the GUI settings envelope.

## For kanmer-verify (on the merged SHA)

`npm run build`; `npm run test:http -w @kanmer/mcp-server` (includes `project-registry.test.mjs`); `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`; `npm run smoke:http`; `npm run typecheck`; `npm run plugin:check` (39 tools). Optionally: write `~/.kanmer/endpoints.json` (or `KANMER_ENDPOINT_REGISTRY`) naming this repo's board and a copy, run the built server against either root, and confirm `list_projects` lists both with the same `project_id` after CORE-114 migration and marks only the served one `bound`; confirm the live board on stable v0.3.12 is unaffected (no file written by any read).
