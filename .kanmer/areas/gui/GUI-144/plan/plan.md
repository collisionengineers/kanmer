# Plan — GUI-144: Surface multi-project registry health and active-controller state in the GUI

## Objective
A "Projects" tab in Settings that observes every endpoint named in the FRD-029 registry (`~/.kanmer/endpoints.json` or `KANMER_ENDPOINT_REGISTRY`) — logical identity, location, health, board sync ahead/behind, policy, controllers and workspaces (claim + CORE-115 lease fields when present) — and lets the operator add the selected open project, rename an entry, set its policy label, or remove it, through a serialised atomic writer. The selected project is the only mutable one; other endpoints are observational with "Open project" as their only action.

## Starting state
- origin/main e903289e: `packages/mcp-server/src/project-registry.ts` defines the contract and a read surface; `writeRegistry` atomic, `upsertEndpoint` unlocked read-modify-write (MCP-054 F-001). No GUI surface; `docs/manual/connect.md` says the app view "is tracked separately (GUI-144)".
- GUI main has per-tab `ProjectContext{sourceRoot, boardRoot, store}`; `RemoteSection` + `RemoteAccessManager.overview()` are the cross-project pattern; `inspectBoardSync`/`inspectBoardWorktree` in `kanmerGit.ts`; `remoteProjectIdentity` yields the `kanmer-proj-v1` fingerprint.
- The GUI cannot import the server module with types (no d.ts, composite tsconfig) — see open-questions.

## Governing docs
- **FRD-029** — Meets. One process per project unchanged (the GUI observes with throw-away read-only `KanmerStore`s in its own process, never spawns or redirects a server). Registry names endpoints and the view reports location, policy, health, sync, controllers, workspaces. Cross-project operations are observational: no board mutation exists for a non-selected endpoint; registry edits are metadata only. No renderer-supplied path: add takes an open tab's projectId, roots come from `ProjectContext`; the folder picker remains the only way a path enters (AC5 spirit). Not modified.
- **PRD-002 req 2 / ADR-0021** — Meets: live board untouched; no new stage/queue. No new ADR.

## Required changes
1. `apps/gui/src/main/projectRegistry.ts`: exports `ENDPOINT_NAME_RE`, `registryLocation(env, home)`, `parseRegistry`, `validateEntry`, `readRegistry`, `observeRegistry(env, home, deps, selected)` returning `{ registry:{path,source,exists,error}, endpoints: RegistryEndpointView[] }` where each endpoint carries `name, boardRoot, repoRoot, boardBranch, policy, health, selected, project{project_id,board_id,identity,origin,fingerprint}, location{repoPath,boardPath,boardBranch,remoteOrigin}, boardSync{remote,ahead,behind,localSha,remoteSha}, format, ticketCount, controllers[], workspaces[], problems[]`; `workspaces[]` items carry `ticket, branch, worktree, controller, claim, expiresAt, assignee, lease{id,revision,phase,provider,heartbeatAt,workspace}|null`. `class ProjectRegistryWriter` (or functions) with an in-process queue: `upsert(name, entry)`, `rename(from,to)`, `remove(name)`, `setPolicy(name, policy|null)`; each validates, reads, mutates, verifies the file is unchanged since the read (text compare), writes tmp + rename. Deps injectable for tests (`inspectBoardSync`, `inspectBoardBranch`, `remoteOrigin`, `now`).
2. `apps/gui/src/shared/ipc.ts`: `CH.registryObserve/registryAddProject/registryRename/registryRemove/registrySetPolicy`; types `RegistryView`, `RegistryEndpointView`, `RegistryWorkspaceView`; `KanmerApi` members `registryObserve(): Promise<RegistryView>`, `registryAddProject(projectId, name, policy?)`, `registryRename(from,to)`, `registryRemove(name)`, `registrySetPolicy(name, policy)`.
3. `apps/gui/src/preload/index.ts`: bridge the five channels.
4. `apps/gui/src/main/index.ts`: handlers with `assertTrustedRemoteSender`; `registryAddProject` requires `requireCtx(projectId)` and uses `ctx.boardRoot`/`ctx.sourceRoot`/`ctx.syncStatus.branch`; observation passes the selected project's identity (`store.getProject()` id, fingerprint from `remoteIdentity`) so the view marks `selected`. Validate name/policy strings at the IPC boundary (name regex; policy ≤ 64 chars no control chars).
5. Renderer `apps/gui/src/renderer/src/components/ProjectRegistry.tsx`: `ProjectRegistrySection({ projectId })` — loads `registryObserve` on mount and after each write; shows registry path/source/error; per endpoint an `article` (aria-label `Registry endpoint <name>`) with health badge, project_id/board_id, location, branch, sync, policy, ticket count, controllers, workspaces (claim state + lease phase/heartbeat when present), problems; selected endpoint shows rename/policy/remove controls; non-selected endpoints show only "Open project" (calls `openProject(boardRoot's repoRoot)` — the repoRoot recorded in the registry, the same value the picker produced when it was added). When the selected project is not registered, an "Add this project" form (name input, policy input). Refresh button.
6. `Settings.tsx`: add tab `{ id: "projects", label: "Projects" }` rendering the section.
7. Docs: `docs/manual/settings.md` "Projects" section; `docs/manual/connect.md` sentence update; regenerate `chapters.generated.ts`.
8. Tests: `projectRegistry.test.ts` (main), `ProjectRegistry.test.tsx` (renderer), preload test update if it enumerates keys.

## Expected files
| Action | Path | Responsibility |
|---|---|---|
| Add | `apps/gui/src/main/projectRegistry.ts` | contract mirror, observer, serialised writer |
| Add | `apps/gui/src/main/projectRegistry.test.ts` | unit + contract tests |
| Modify | `apps/gui/src/main/index.ts` | IPC handlers |
| Modify | `apps/gui/src/shared/ipc.ts` | channels, types, api |
| Modify | `apps/gui/src/preload/index.ts` (+ test if needed) | bridge |
| Add | `apps/gui/src/renderer/src/components/ProjectRegistry.tsx` | section UI |
| Add | `apps/gui/src/renderer/src/components/ProjectRegistry.test.tsx` | renderer tests |
| Modify | `apps/gui/src/renderer/src/components/Settings.tsx` | tab |
| Modify | `apps/gui/src/renderer/src/styles.css` | small badge styles if needed |
| Modify | `docs/manual/settings.md`, `docs/manual/connect.md` | manual |
| Regenerate | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | generated artifact, committed |

## Do not modify
`packages/core/**`, `packages/mcp-server/**`, `.worktrees/kanmer`, `plugins/**`, `AGENTS.md` tool counts.

## Constraints
- No new dependencies. Main bundle stays CJS via electron-vite; only `@kanmer/core`, node builtins, electron.
- Observation never writes to any board (`exists()` before reads, no `init()`); git probes never throw; per-endpoint failures become `health: "error"`.
- File contract byte-identical in meaning to the server module (schema 1, same regex, same optional keys, 2-space JSON + trailing newline).
- Renderer never sends a filesystem path to a registry channel.

## Ordered steps
1. Worktree `.worktrees/gui-144`, branch `gui-144-project-registry` from origin/main.
2. Write `projectRegistry.ts` (contract + observer + writer).
3. Write `projectRegistry.test.ts`: location precedence; parse/validate matrix; two temp boards (one with `project.json` identity + live claim + lease fields, one legacy without identity) → distinct health `ok`/`unassigned`, selected marked by project_id then fingerprint; missing board; invalid entry; malformed file; 20 concurrent upserts produce all entries; stale-edit guard refuses when the file changed between read and write; contract test importing `packages/mcp-server/src/project-registry.ts` by runtime path and asserting `parseRegistry` ok and `validateEntry` empty for the GUI's output (fallback: compare against a literal fixture if the import cannot load).
4. Add ipc types/channels, preload bridge, main handlers.
5. Renderer section + Settings tab + styles.
6. `ProjectRegistry.test.tsx`: two endpoints with distinct health rendered; non-selected shows no rename/remove/policy controls and only "Open project"; add form calls `registryAddProject(projectId, name, policy)`; rename/remove call the right api.
7. Docs + `npm run build:manual`.
8. Run commands; write post-implementation report; open PR with `Kanmer: GUI-144` footer; move to Review.

## Acceptance checks
- Production callers: handlers registered in `registerIpc` in `index.ts`; section composed from `Settings.tsx` tab `projects`.
- Tests prove two projects with distinct health and that a non-selected project has no mutation controls (ticket verification line).
- Concurrent writes serialised (F-001).

## Commands
cwd `.worktrees/gui-144`: `npm ci` (if needed); `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx -w`… (use `npm test -w @kanmer/gui -- <files>`); `npm test -w @kanmer/gui`; `npm run typecheck -w @kanmer/gui`; `npm run build:manual`; `npm run check:manual`; `npm run verify:docs`; `npm run build -w @kanmer/gui`.

## Failure and deviation rules
Stop and report if a server/core change becomes necessary, if the contract import cannot be made to work and no fixture-based fallback is acceptable, or if any existing test must be weakened. Record known host quirks (EBUSY, ETIMEDOUT) without chasing.

## Stop condition
PR open with a `Kanmer: GUI-144` footer, ticket in Review with the post-implementation report written. No merge, no other ticket.
