# Post-implementation report — GUI-144

Branch `gui-144-project-registry`, worktree `.worktrees/gui-144`, head `a9033ec2229c05819a6fa6a9e0cf3bf3b4bb0a12` (from `origin/main` e903289e). One commit. PR https://github.com/collisionengineers/kanmer/pull/294.

## Files changed and why

| File | Why |
| --- | --- |
| `apps/gui/src/main/projectRegistry.ts` (new) | GUI mirror of the FRD-029 registry contract (`schema: 1`, `ENDPOINT_NAME_RE`, `validateEntry`, `parseRegistry`, `registryLocation` env→`~/.kanmer/endpoints.json`); `observeEndpoint`/`observeRegistry` with injectable deps (branch, sync, redacted remote origin, machine, now) over throw-away read-only `KanmerStore`s (`exists()` first, never `init()`), health `ok/unassigned/missing-board/invalid/error`, `selected` by `project_id` then `kanmer-proj-v1` fingerprint, `kanmer-loc-v1` location fingerprint, controllers/workspaces via `claimState` with CORE-115 `lease_*` read defensively; `ProjectRegistryWriter` — in-process queue, validate, re-read-and-compare stale guard (`REGISTRY_CHANGED`), malformed file never overwritten (`REGISTRY_MALFORMED`), tmp+rename; `upsert/rename/remove/setPolicy`; `normalizePolicy` (≤64 printable chars). |
| `apps/gui/src/main/projectRegistry.test.ts` (new) | 11 vitest cases (see Verification). Includes a contract test importing `packages/mcp-server/src/project-registry.ts` by runtime path. |
| `apps/gui/src/shared/ipc.ts` | `CH.registry*` (5 channels), `Registry*` view types, `KanmerApi.registry*`. |
| `apps/gui/src/preload/index.ts` | Bridges the five channels. |
| `apps/gui/src/main/index.ts` | Handlers with `assertTrustedRemoteSender`; `registryAddProject` requires an open `ProjectContext` and writes `ctx.boardRoot`/`ctx.sourceRoot`/`ctx.syncStatus.branch` (no renderer path); name/policy validated at the boundary; one process-wide `ProjectRegistryWriter` at the same location the MCP server reads. |
| `apps/gui/src/renderer/src/components/ProjectRegistry.tsx` (new) | `ProjectRegistrySection`: registry path/source/error, add-this-project form when the selected project is unregistered, one card per endpoint (health badge, identity, locations, branch/sync/ticket count/origin/machine, problems, controllers, workspaces with claim + lease), controls only on the selected card, "Open project" only on others. |
| `apps/gui/src/renderer/src/components/ProjectRegistry.test.tsx` (new) | 4 jsdom tests. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | `projects` tab → section. |
| `apps/gui/src/renderer/src/styles.css` | Card grid, health badges, field/actions layout. |
| `docs/manual/settings.md`, `docs/manual/connect.md`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Projects section; connect.md points at it; regenerated mirror. |

## Governing docs

- **FRD-029** — Meets. One MCP process ↔ one project unchanged; the GUI observes in its own process with read-only stores and spawns/redirects nothing. Registry names endpoints and the view reports locations, policy, health, sync, controllers, workspaces. Cross-project operations observational: the only action on a non-selected endpoint is opening it (changing selection); registry edits are metadata. No endpoint/path is taken from a request: the renderer names an open tab, main supplies the roots (the folder picker remains the only entry for a path). "The GUI presents the same selected-project boundary rather than a second global board" — there is no cross-project ticket list or mutation control. Not modified.
- **PRD-002 req 2 / ADR-0021** — Meets; no new ADR.

## Verification (cwd `.worktrees/gui-144`, head a9033ec2)

| Command | Exit |
| --- | --- |
| `npm ci` (worktree; own `node_modules`) | 0 |
| `npm run build -w @kanmer/core` (dist for GUI imports) | 0 |
| `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx src/preload/index.test.ts --root apps/gui` — 16/16 | 0 (first run of the main test: 2 failures — `rename` threw synchronously instead of rejecting, and the stale-edit test raced the hand edit; fixed by making writer methods `async` and adding an `afterRead` test hook; rerun 0) |
| `npm run typecheck -w @kanmer/gui` | 0 |
| `npm run build:manual`, `npm run check:manual`, `npm run verify:docs` | 0, 0, 0 |
| `npm test -w @kanmer/gui` — 52 files passed | 0 |
| `npm run build -w @kanmer/gui` | 0 |

Test claims: two fixture boards (logical identity + live claim with lease fields + expired legacy claim; legacy board without `project.json`) observed as `ok` vs `unassigned` with a byte-level directory snapshot unchanged after every read; selected marking by id then fingerprint; missing-board/invalid/branch-drift problems; malformed registry surfaced and never overwritten; 20 concurrent upserts all present with no `.tmp-` leftovers; stale hand edit rejected; renderer: distinct health per card, non-selected card has no rename/policy/remove control and only "Open project", add form sends `(projectId, name, policy)` only.

## Deviations

1. The GUI does not call the server's `writeRegistry`/`upsertEndpoint`: `@kanmer/mcp-server` ships no `.d.ts` and `apps/gui/tsconfig.node.json` is `composite`, so a typed import needs a server-package change outside this lane. The GUI mirrors the contract and proves it with a runtime contract test against the server source (parked question recorded in open-questions).
2. `ProjectRegistryWriter` accepts an `afterRead` hook (test seam only) so the stale-edit guard can be exercised deterministically.
3. `AGENTS.md` §8 gotcha 16 still says the writer helpers are for "the GUI (GUI-144)"; not edited (AGENTS.md is outside the packet's files; the main checkout carries unrelated uncommitted AGENTS.md edits). Reviewer may want a one-line follow-up.
4. `verify` rail and `test:scripts` not run here (known host EBUSY quirk; hosted verify authoritative).

## Risks / follow-ups

- Observation runs git probes per endpoint (`inspectBoardWorktree`, `inspectBoardSync`, `remote get-url`, 15 s timeouts) — a large registry over slow disks makes the tab slow, never failing; no polling, refresh is manual.
- "Open project" opens the registry's `repoRoot` (falls back to `boardRoot`); an entry written by hand with only a `boardRoot` that is itself a board worktree opens that worktree as a project.
- Follow-up (parked): typed export of the registry helpers from `@kanmer/mcp-server` so the mirror can be deleted.

## For kanmer-verify (on the merged SHA)

`npm ci`; `npm run build -w @kanmer/core`; `npm test -w @kanmer/gui` (includes `projectRegistry.test.ts` and `ProjectRegistry.test.tsx`); `npm run typecheck -w @kanmer/gui`; `npm run check:manual`; `npm run verify:docs`; `npm run build -w @kanmer/gui`. Optionally launch the GUI, open two projects, add each in Settings → Projects, confirm `~/.kanmer/endpoints.json` matches what `list_projects` reports and that the non-selected card only offers "Open project".
