# Post-implementation report — GUI-144

Branch `gui-144-project-registry`, worktree `.worktrees/gui-144`, PR https://github.com/collisionengineers/kanmer/pull/294.

Head `50ff61cce20c0ad76a443160716d817f724d30fb` (two commits on `origin/main` 3dd48d37: `f811952f` the original implementation rebased, `50ff61cc` remediation round 1). The pre-rebase head `a9033ec2` is no longer reachable.

## Files changed and why

| File | Why |
| --- | --- |
| `apps/gui/src/main/projectRegistry.ts` (new) | GUI mirror of the FRD-029 registry contract (`schema: 1`, `ENDPOINT_NAME_RE`, `validateEntry`, `parseRegistry`, `registryLocation` env→`~/.kanmer/endpoints.json`); `observeEndpoint`/`observeRegistry` with injectable deps over throw-away read-only `KanmerStore`s (`exists()` first, never `init()`), health `ok/unassigned/missing-board/invalid/error`, `selected` by `project_id` then `kanmer-proj-v1` fingerprint, `kanmer-loc-v1` location fingerprint computed with the server's `redactRemoteOrigin` and the server's origin probe (`git config --get remote.origin.url` in the board path); `claims` classifies every taken ticket with core `leaseState` (falls back to `claimState`), lists all as workspaces, counts only live claims as controllers; `assertSelectedEndpoint` and `entryForContext` for main; `ProjectRegistryWriter` — in-process queue, re-read-and-compare stale guard (`REGISTRY_CHANGED`), malformed file never overwritten, tmp+rename; `add` (refuses an existing name), `upsert`, `rename`, `remove`, `setPolicy`; `normalizePolicy`. |
| `apps/gui/src/main/projectRegistry.test.ts` (new) | 16 vitest cases (see Verification). Contract tests import `packages/mcp-server/src/project-registry.ts` and `project-identity.ts` by runtime path. |
| `apps/gui/src/shared/ipc.ts` | `CH.registry*` (5 channels), `Registry*` view types (lease view carries `heartbeatStale`), `KanmerApi.registry*` — rename/remove/policy take a required `projectId`. |
| `apps/gui/src/preload/index.ts` | Bridges the five channels. |
| `apps/gui/src/main/index.ts` | Handlers with `assertTrustedRemoteSender`; `registryAddProject` requires an open `ProjectContext` and writes `entryForContext(ctx)` through `writer.add` (no renderer path; `boardBranch` only when the board is git-backed; existing name refused); `registryRename/Remove/SetPolicy` require the sender's open project and call `assertSelectedEndpoint(await registryView(projectId), name)` before writing; one process-wide `ProjectRegistryWriter` at the location the MCP server reads. |
| `apps/gui/src/renderer/src/components/ProjectRegistry.tsx` (new) | `ProjectRegistrySection({ projectId, onOpenProject })`: registry path/source/error, add-this-project form when the selected project is unregistered, one card per endpoint (health badge, identity, locations, branch/sync/ticket count/origin/machine, problems, active controllers, workspaces with claim + lease + stale-heartbeat flag), controls only on the selected card; "Open project" on other cards calls the App-level `onOpenProject`. |
| `apps/gui/src/renderer/src/components/ProjectRegistry.test.tsx` (new) | 6 jsdom tests. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | `projects` tab → section; new required prop `onOpenProject` passed through. |
| `apps/gui/src/renderer/src/App.tsx` | Passes its `openProject` (tabs + board state + saved UI state) to `Settings` as `onOpenProject`. |
| `apps/gui/src/renderer/src/styles.css` | Card grid, health badges, field/actions layout. |
| `docs/manual/settings.md`, `docs/manual/connect.md`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Projects section (selection path, refusal rules, live-only controllers, stale heartbeat); connect.md points at it; regenerated mirror. |

## Remediation round 1

Review `scratch/review.md` v63961e7382adc4e0 (head a9033ec2) returned `needs-changes`. The branch was first rebased onto `origin/main` 3dd48d37 (CORE-115) — clean, no conflicts. F-001 was reproduced locally on the rebased branch after `npm run build -w @kanmer/core` (the worktree's stale core dist had masked it): `npx vitest run src/main/projectRegistry.test.ts --root apps/gui` → 1 failed, `expected 1 to be 2` at the ticket-count assertion.

| Finding | Resolution |
| --- | --- |
| F-001 (major) | Fixture no longer hand-injects `lease_*` keys. `takeTicket(..., provider: "claude-code")` now mints the lease; the test captures the returned record and asserts the observed workspace lease equals it field by field (id, revision 1, phase `implementing`, provider, workspace, heartbeat, expiry). The expired legacy claim strips the minted `lease_*` keys so it is a genuine pre-CORE-115 claim. The distinct-health/controllers assertions are unchanged in strength (controllers assertion tightened by F-007). |
| F-002 (major) | `ProjectRegistrySection` takes `onOpenProject`; `Settings` gains the required prop; `App.tsx` passes its `openProject`. "Open project" therefore goes through the same path as the folder picker (tab added, board/items/format swapped, saved UI state restored). Renderer tests: the raw `window.kanmer.openProject` stub throws if called; a rerender with the new `projectId` proves the section reloads and shows the opened project as selected with controls, and the previous one as observation-only. |
| F-003 (minor) | Main enforces the selected-project rule: `registryRename/Remove/SetPolicy` require `projectId` (no longer nullable), `requireCtx`, then `assertSelectedEndpoint(view, name)` which throws `REGISTRY_NOT_SELECTED` unless `name` is the endpoint the observation marked `selected` for that project's identity. Unit test covers match, other name, unregistered project, no project; renderer test shows the refusal surfacing. |
| F-004 (minor) | `redactRemoteOrigin` is now the server's implementation line for line (SCP `git@host:...` keeps its login; `user:token@` loses the token), and the probe is the server's (`git config --get remote.origin.url` in the board path, not `remote get-url` in the repo). Contract test imports `project-identity.ts` and asserts equality across 10 origin probes and that the GUI's `kanmer-loc-v1` fingerprint equals `server.locationFingerprint(...)` for the same facts. |
| F-005 (minor) | `entryForContext` records `boardBranch` only when `syncStatus.available && boardRoot && branch` — a non-git project gets no branch and hence no drift/sync probe. Tested (git-backed, non-git, git-error cases). |
| F-006 (minor) | `ProjectRegistryWriter.add` refuses an existing name with `REGISTRY_NAME_EXISTS`; the add handler uses it instead of `upsert`. Tested. Manual updated. |
| F-007 (minor) | `claims` uses core `leaseState(item, now, leaseConfig(board))` (guarded, `claimState` fallback); only `state === "live"` claims populate controllers, expired claims stay listed as workspaces; `heartbeatStale` is surfaced on the lease view and card; a legacy claim's derived expiry is reported. Tested; manual updated. |
| F-008..F-012 | Accepted-risk per the attestation; no change. |

## Governing docs

- **FRD-029** — Meets. One MCP process ↔ one project unchanged; the GUI observes in its own process with read-only stores and spawns/redirects nothing. Registry names endpoints and the view reports locations, policy, health, sync, controllers, workspaces. Cross-project operations observational: the only action on a non-selected endpoint is opening it, which is the App's selection path; registry edits are metadata and main refuses them for any endpoint but the selected project's. No endpoint/path is taken from a request. Location fingerprints agree with `list_projects`. Not modified.
- **PRD-002 req 2 / ADR-0021** — Meets; no new ADR.

## Verification (cwd `.worktrees/gui-144`, head 50ff61cc)

| Command | Exit |
| --- | --- |
| `git fetch origin && git rebase origin/main` | 0 (clean) |
| `npm run build -w @kanmer/core` | 0 |
| `npx vitest run src/main/projectRegistry.test.ts --root apps/gui` (before fix, reproduces F-001) | 1 — `expected 1 to be 2` |
| `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx --root apps/gui` — 22/22 | 0 (first run 1 failure: my new F-007 test expected `heartbeatStale: false` for a lease with no heartbeat; core treats `taken_at` as the last beat, so the expectation was corrected to `true`) |
| `npm run typecheck -w @kanmer/gui` | 0 |
| `npm run build:manual`, `npm run check:manual`, `npm run verify:docs` | 0, 0, 0 |
| `npm test -w @kanmer/gui` — 52 files / 515 tests | 0 |

Hosted run 33115961602 for 50ff61cc: `verify` **success** (job 98670556296); `kanmer-gate` **failure** (job 98670556623) solely on `WRONG_STAGE` — board f3a5d31f still showed the ticket in `implementing` when the gate ran (warnings: `STALE_REVIEW` attestation shape, `COMMITS_UNREACHABLE` for the pre-rebase a9033ec2); `regate` skipped. The gate needs a controller re-run once the board records Review.

## Deviations

1. The GUI does not call the server's `writeRegistry`/`upsertEndpoint` (no `.d.ts`, composite tsconfig); it mirrors the contract and proves parity with runtime contract tests against both server source modules (parked in open-questions).
2. `ProjectRegistryWriter` accepts an `afterRead` hook (test seam only).
3. `AGENTS.md` §8 gotcha 16 still says the writer helpers are for "the GUI (GUI-144)"; not edited (outside the packet; F-012 accepted).
4. `verify` rail and `test:scripts` not run locally (host EBUSY quirk; hosted verify is green and authoritative).
5. `App.tsx` was touched (one prop) though not in the packet's file table — required to route "Open project" through the App-level callback (F-002); no other change there.

## Risks / follow-ups

- Observation runs git probes per endpoint (15 s timeouts); rename/policy/remove now observe once more before writing, so a slow registry makes those edits slower, never wrong.
- "Open project" opens the registry's `repoRoot` (falls back to `boardRoot`).
- Follow-up (parked): typed export of the registry/identity helpers from `@kanmer/mcp-server` so the mirror can be deleted.

## For kanmer-verify (on the merged SHA)

`npm ci`; `npm run build -w @kanmer/core`; `npm test -w @kanmer/gui` (includes `projectRegistry.test.ts` 16 and `ProjectRegistry.test.tsx` 6); `npm run typecheck -w @kanmer/gui`; `npm run check:manual`; `npm run verify:docs`; `npm run build -w @kanmer/gui`. Optionally launch the GUI, open two projects, add each in Settings → Projects, confirm `~/.kanmer/endpoints.json` matches `list_projects` (including the `kanmer-loc-v1` fingerprint for an SCP origin), that "Open project" on the other card switches the tab and moves the "Selected project" badge, and that adding a duplicate name is refused.
