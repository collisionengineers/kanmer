# Post-implementation report — GUI-144

Branch `gui-144-project-registry`, worktree `.worktrees/gui-144`, PR https://github.com/collisionengineers/kanmer/pull/294.

Head `190b022ac9fa6065b9df675fd7cab4f5b5fe3302` (three commits on `origin/main` 9c9a6980/CORE-124: `19fe9fd1` original implementation, `3ec2c09b` remediation round 1, `190b022a` remediation round 2 — all rebased; the earlier heads `a9033ec2` and `50ff61cc` are no longer reachable).

## Files changed and why

| File | Why |
| --- | --- |
| `apps/gui/src/main/projectRegistry.ts` (new) | GUI mirror of the FRD-029 registry contract (`schema: 1`, `ENDPOINT_NAME_RE`, `validateEntry`, `parseRegistry`, `registryLocation` env→`~/.kanmer/endpoints.json`); `observeEndpoint`/`observeRegistry` with injectable deps over throw-away read-only `KanmerStore`s (`exists()` first, never `init()`), health `ok/unassigned/missing-board/invalid/error`, `selected` by `project_id` then `kanmer-proj-v1` fingerprint, `kanmer-loc-v1` location fingerprint computed with the server's `redactRemoteOrigin` and the server's origin probe (`git config --get remote.origin.url` in the board path); `claims` classifies every taken ticket with core `leaseState` (falls back to `claimState`), lists all as workspaces, counts only live claims as controllers; `assertSelectedEndpoint` (accepts any endpoint bound to the sender's project — F-014) and `entryForContext` for main; `ProjectRegistryWriter` — in-process queue, re-read-and-compare stale guard (`REGISTRY_CHANGED`), malformed file never overwritten, tmp+rename; `add` (refuses an existing name), `upsert`, `rename`, `remove`, `setPolicy`; `normalizePolicy`. |
| `apps/gui/src/main/projectRegistry.test.ts` (new) | 17 vitest cases (see Verification). Contract tests import `packages/mcp-server/src/project-registry.ts` and `project-identity.ts` by runtime path. |
| `apps/gui/src/shared/ipc.ts` | `CH.registry*` (5 channels), `Registry*` view types (lease view carries `heartbeatStale`), `KanmerApi.registry*` — rename/remove/policy take a required `projectId`. |
| `apps/gui/src/preload/index.ts` | Bridges the five channels. |
| `apps/gui/src/main/index.ts` | Handlers with `assertTrustedRemoteSender`; `registryAddProject` requires an open `ProjectContext` and writes `entryForContext(ctx)` through `writer.add` (no renderer path; `boardBranch` only when the board is git-backed; existing name refused); `registryRename/Remove/SetPolicy` require the sender's open project and call `assertSelectedEndpoint(await registryView(projectId), name)` before writing; one process-wide `ProjectRegistryWriter` at the location the MCP server reads. |
| `apps/gui/src/renderer/src/components/ProjectRegistry.tsx` (new) | `ProjectRegistrySection({ projectId, onOpenProject })`: registry path/source/error, add-this-project form when the selected project is unregistered, one card per endpoint (health badge, identity, locations, branch/sync/ticket count/origin/machine, problems, active controllers, workspaces with claim + lease + stale-heartbeat flag), controls only on the selected card; "Open project" on other cards calls the App-level `onOpenProject` and is disabled unless the board was actually observed (health `ok`/`unassigned` — F-015). |
| `apps/gui/src/renderer/src/components/ProjectRegistry.test.tsx` (new) | 7 jsdom tests. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | `projects` tab → section; `onOpenProject` prop; the Projects tab routes opens through a Settings-level guard: a modified board draft blocks the switch behind an explicit "Discard and open"; save refuses a draft whose project changed under it (F-013 defence in depth); optional `initialTab`/`onTabChange` so the App can restore the tab across the keyed remount. |
| `apps/gui/src/renderer/src/components/Settings.projects.test.tsx` (new) | 3 jsdom tests for the F-013 guard, keyed-remount draft reset, and unkeyed save refusal. |
| `apps/gui/src/renderer/src/App.tsx` | `<Settings key={root ?? "none"} …>` so a project switch remounts Settings with a fresh draft; `onOpenProject` routes through `requestOpen({ kind: "path" })` — the same dirty-editor-guarded path as the folder picker and tab strip (F-013); a ref restores the Settings tab across the remount and resets it on close. |
| `apps/gui/src/renderer/src/styles.css` | Card grid, health badges, field/actions layout. |
| `docs/manual/settings.md`, `docs/manual/connect.md`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Projects section (selection path, refusal rules, live-only controllers, stale heartbeat, unsaved-draft guard, disabled open for unobservable boards); connect.md points at it; regenerated mirror. |

## Remediation round 1

Review `scratch/review.md` v63961e7382adc4e0 (head a9033ec2) returned `needs-changes`. The branch was first rebased onto `origin/main` 3dd48d37 (CORE-115) — clean, no conflicts. F-001 was reproduced locally on the rebased branch after `npm run build -w @kanmer/core` (the worktree's stale core dist had masked it): `npx vitest run src/main/projectRegistry.test.ts --root apps/gui` → 1 failed, `expected 1 to be 2` at the ticket-count assertion.

| Finding | Resolution |
| --- | --- |
| F-001 (major) | Fixture no longer hand-injects `lease_*` keys. `takeTicket(..., provider: "claude-code")` now mints the lease; the test captures the returned record and asserts the observed workspace lease equals it field by field (id, revision 1, phase `implementing`, provider, workspace, heartbeat, expiry). The expired legacy claim strips the minted `lease_*` keys so it is a genuine pre-CORE-115 claim. The distinct-health/controllers assertions are unchanged in strength (controllers assertion tightened by F-007). |
| F-002 (major) | `ProjectRegistrySection` takes `onOpenProject`; `Settings` gains the required prop; `App.tsx` passes its open path. "Open project" therefore goes through the same path as the folder picker (tab added, board/items/format swapped, saved UI state restored). Renderer tests: the raw `window.kanmer.openProject` stub throws if called; a rerender with the new `projectId` proves the section reloads and shows the opened project as selected with controls, and the previous one as observation-only. |
| F-003 (minor) | Main enforces the selected-project rule: `registryRename/Remove/SetPolicy` require `projectId` (no longer nullable), `requireCtx`, then `assertSelectedEndpoint(view, name)` which throws `REGISTRY_NOT_SELECTED` unless `name` is an endpoint the observation marked `selected` for that project's identity. Unit test covers match, other name, unregistered project, no project; renderer test shows the refusal surfacing. |
| F-004 (minor) | `redactRemoteOrigin` is now the server's implementation line for line (SCP `git@host:...` keeps its login; `user:token@` loses the token), and the probe is the server's (`git config --get remote.origin.url` in the board path, not `remote get-url` in the repo). Contract test imports `project-identity.ts` and asserts equality across 10 origin probes and that the GUI's `kanmer-loc-v1` fingerprint equals `server.locationFingerprint(...)` for the same facts. |
| F-005 (minor) | `entryForContext` records `boardBranch` only when `syncStatus.available && boardRoot && branch` — a non-git project gets no branch and hence no drift/sync probe. Tested (git-backed, non-git, git-error cases). |
| F-006 (minor) | `ProjectRegistryWriter.add` refuses an existing name with `REGISTRY_NAME_EXISTS`; the add handler uses it instead of `upsert`. Tested. Manual updated. |
| F-007 (minor) | `claims` uses core `leaseState(item, now, leaseConfig(board))` (guarded, `claimState` fallback); only `state === "live"` claims populate controllers, expired claims stay listed as workspaces; `heartbeatStale` is surfaced on the lease view and card; a legacy claim's derived expiry is reported. Tested; manual updated. |
| F-008..F-012 | Accepted-risk per the attestation; no change. |

## Remediation round 2

Review `scratch/review.md` v7899872c49fddca3 (head 50ff61cc, delta round) returned `needs-changes` with F-013 (major) and F-014/F-015 (minor). The branch was rebased onto `origin/main` 9c9a6980 (CORE-124) — clean, no conflicts — before the fixes.

| Finding | Resolution |
| --- | --- |
| F-013 (major) | Fixed structurally, both ways the reviewer asked for. (1) The registry card's "Open project" now reaches the App as `requestOpen({ kind: "path", path })` (`openProjectFromSettings`, App.tsx), so the App's dirty-editor confirm applies exactly as for the picker and tab strip. (2) `<Settings key={root ?? "none"}>` remounts Settings on every project switch, so `draft` (initialised once from `board`) can never outlive its project; a ref preserves the open tab across the remount and resets it when Settings closes. Defence in depth inside Settings: a modified board draft blocks the Projects-tab open behind an explicit "Discard and open" `alertdialog`, and `save` refuses when the draft's originating `projectId` differs from the current one ("this draft belongs to another project"). New `Settings.projects.test.tsx`: (a) dirty draft for A + "Open project" B → guard fires, `onOpenProject` not called until "Discard and open"; after the re-keyed switch the draft is B's board, `onSaveBoard` receives exactly B's config and never A's edit; (b) even unkeyed, saving A's draft under B's projectId is refused and `onSaveBoard` is never called; (c) a clean draft opens without any prompt. |
| F-014 (minor) | `assertSelectedEndpoint` now filters all `selected` endpoints (a registry may validly name one logical project several times) and accepts the named one if it is among them; the refusal lists every bound name. Test: `alpha` + `alpha-mirror` both bound to project A — both accepted, `beta` refused with both names in the message. |
| F-015 (minor) | The "Open project" button is disabled unless the endpoint's board was actually observed (`health` `ok` or `unassigned`), with an explanatory hint, so a stale registry pointer can never reach `openProjectLocked`'s `store.init()` and silently become a fresh empty board. Test: `missing-board`, `invalid` and `error` endpoints all render a disabled button + refusal hint and clicking calls nothing; an `unassigned` endpoint stays openable. Manual updated. |
| F-008..F-012 | Accepted-risk per the attestation; no change. |

## Governing docs

- **FRD-029** — Meets. One MCP process ↔ one project unchanged; the GUI observes in its own process with read-only stores and spawns/redirects nothing. Registry names endpoints and the view reports locations, policy, health, sync, controllers, workspaces. Cross-project operations observational: the only action on a non-selected endpoint is opening it, which is the App's guarded selection path; a board draft can no longer follow a switch (F-013), so no GUI path mutates a non-selected project's board. Registry edits are metadata and main refuses them for any endpoint but the selected project's. No endpoint/path is taken from a request. Location fingerprints agree with `list_projects`. Not modified.
- **PRD-002 req 2 / ADR-0021** — Meets; no new ADR.

## Verification (cwd `.worktrees/gui-144`, head 190b022a)

| Command | Exit |
| --- | --- |
| `git fetch origin && git rebase origin/main` (9c9a6980, CORE-124) | 0 (clean) |
| `npm run typecheck -w @kanmer/gui` | 0 |
| `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx src/renderer/src/components/Settings.projects.test.tsx --root apps/gui` — 27/27 | 0 (first run 1 failure: my new F-015 test expected the badge text "No identity"; the component renders "No identity yet" — expectation corrected) |
| `npm run build:manual`, `npm run check:manual`, `npm run verify:docs` | 0, 0, 0 |
| `npm test -w @kanmer/gui` — 53 files / 520 tests | 0 |

Hosted run for 190b022a: see the execute scratch note recorded after the run completed (`verify` is the authoritative required check; `kanmer-gate` reads the remote board tip and needs the controller's re-run once the board records Review).

## Deviations

1. The GUI does not call the server's `writeRegistry`/`upsertEndpoint` (no `.d.ts`, composite tsconfig); it mirrors the contract and proves parity with runtime contract tests against both server source modules (parked in open-questions).
2. `ProjectRegistryWriter` accepts an `afterRead` hook (test seam only).
3. `AGENTS.md` §8 gotcha 16 still says the writer helpers are for "the GUI (GUI-144)"; not edited (outside the packet; F-012 accepted).
4. `verify` rail and `test:scripts` not run locally (host EBUSY quirk; hosted verify is authoritative).
5. `App.tsx` and `Settings.tsx` were touched beyond the packet's original file table — required by F-002 (round 1) and F-013's structural fix (round 2: keyed remount, guarded open routing, tab persistence); `Settings.projects.test.tsx` added to prove the guard.

## Risks / follow-ups

- Observation runs git probes per endpoint (15 s timeouts); rename/policy/remove now observe once more before writing, so a slow registry makes those edits slower, never wrong.
- "Open project" opens the registry's `repoRoot` (falls back to `boardRoot`) and only when the board was observed (F-015).
- Reopening Settings after closing it starts on the Board tab (unchanged); the tab is preserved only across a project switch while Settings stays open.
- Follow-up (parked): typed export of the registry/identity helpers from `@kanmer/mcp-server` so the mirror can be deleted.

## For kanmer-verify (on the merged SHA)

`npm ci`; `npm run build -w @kanmer/core`; `npm test -w @kanmer/gui` (includes `projectRegistry.test.ts` 17, `ProjectRegistry.test.tsx` 7 and `Settings.projects.test.tsx` 3); `npm run typecheck -w @kanmer/gui`; `npm run check:manual`; `npm run verify:docs`; `npm run build -w @kanmer/gui`. Optionally launch the GUI, open two projects, add each in Settings → Projects, confirm `~/.kanmer/endpoints.json` matches `list_projects` (including the `kanmer-loc-v1` fingerprint for an SCP origin), that "Open project" on the other card switches the tab and moves the "Selected project" badge, that a dirty board draft prompts before the switch and is discarded by it, that "Open project" is disabled for a registry entry whose path has no board, and that adding a duplicate name is refused.
