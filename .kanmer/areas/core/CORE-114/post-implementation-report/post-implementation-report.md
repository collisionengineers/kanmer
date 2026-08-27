# Post-implementation report — CORE-114

Branch `core-114-project-identity`, worktree `.worktrees/core-114`, head `e2bb6ed895a9e3074a3d9521113ac64d153cbecc` (from `origin/main` 3267c7df). One commit.

## Files changed and why

| File | Why |
| --- | --- |
| `packages/core/src/project.ts` (new) | `ProjectRecord`, `readProjectRecord` (malformed → null), `allocateProjectRecord` (idempotent UUID allocation, `migratedFrom` evidence), `computeRevision` (`rev1:` digest over ticket bytes + sorted `[path, contentVersion]`, excluding `scratch/`/`reference/`), `isProjectIdShape`. |
| `packages/core/src/project.test.ts` (new) | 10 tests: allocation idempotence, fallback evidence, malformed file, fresh `generated` vs legacy `migrated` init with activity entry, copy keeps id, `migrateBoard` identity step + dry run, revision stability/exclusions, F-015 proof rewrite changes revision but not `updated`, stale `expectedRevision` refused on every mutation with bytes unchanged. |
| `packages/core/src/paths.ts` | `projectFile` (`.kanmer/project.json`). |
| `packages/core/src/store.ts` | `init(opts)` decides origin from pre-existing files and calls `ensureProject`; `getProject`, `ensureProject` (activity `board/project_id`), `getRevision`, private `revisionAt`/`assertRevision`; `expectedRevision` on `updateItem`, `assertMoveAllowed`/`moveItem`, `takeTicket`, `setDoc`, `appendScratch` — checked after validation, before any write, with the `Conflict:` prefix. |
| `packages/core/src/links.ts` | `linkItems(..., { expectedRevision })` passthrough. |
| `packages/core/src/migrate.ts` | `migrateIdentity` + `IdentityReport`; `migrateBoard` returns `identity` and allocates even when `alreadyV3`; dry run never writes. |
| `packages/core/src/types.ts` | `expectedRevision` on `UpdateItemPatch`, `SetDocOptions`, `TakeTicketInput`; `InitOptions`, `TicketRevision`. |
| `packages/core/src/index.ts` | export `project.js`. |
| `packages/core/src/store.test.ts` | activity-log op sequence now starts with the identity allocation entry (asserted explicitly). |
| `packages/mcp-server/src/project-identity.ts` | `LocationFingerprint`/`locationFingerprint` (`kanmer-loc-v1`), `LogicalProject`, `expectedProjectMatches`; `kanmer-proj-v1` bytes untouched. |
| `packages/mcp-server/src/errors.ts` | `failCoded(error, project?)` decorates `structuredContent.project`; `ResponseProject`. |
| `packages/mcp-server/src/index.ts` | `ToolResult` type; `ok()`/`fail()`/`guard()` carry `structuredContent.project`; `legacyIdentity`, `resolveProject`, `resolveLocation` (git `remote.origin.url`, `os.hostname`, board branch; null on failure), `assertExpectedProject` (single WRONG_PROJECT point used by `write()`, `dispatch_task`, `cancel_dispatch`); `ensureInit` passes the fingerprint as fallback; `expected_revision` field on 7 ticket mutations; `get_status.project` + `compat` extended; `get_item.revision`; `set_ticket_doc` returns `revision`; execution packet gains `project.project_id/board_id/identity` and `ticket.revision`; `migrate_board` passes the fallback fingerprint. |
| `packages/mcp-server/src/smoke.mjs` | +17 FRD-029 checks (see Verification); one assertion adapted (reviewer focus 1). |
| `packages/mcp-server/src/smoke-protocol.mjs` | optional `expected_revision` on every protocol version. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md` | contract docs: `project_id` as `expected_project`, `expected_revision`, `structuredContent.project`, location evidence, legacy migration. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated bundle (`plugin:check` OK). |
| `AGENTS.md` | §4 layout (`project.json`), §8 gotcha 15 (why not board.yml/version.json; rollback = delete file, re-migrates a *new* uuid; revision scope). |

## Governing docs

- **FRD-029** — Meets acceptance 1 (smoke: copied board keeps `project_id`, `location.fingerprint` and legacy fingerprint differ), 2 (every read/write/error result carries `structuredContent.project`; wrong `expected_project` refused before init — sandbox tree unchanged), 3 (stale `expected_revision` → `REVISION_CONFLICT`, ticket folder snapshot identical), 5 (no mutating schema has a `root|path_root|project_root|board_root|repo_root|cwd` property; root fixed at boot). Acceptance 4 is MCP-054. Edge cases: legacy board reports `identity: "unassigned"`, a guessed id is WRONG_PROJECT, first accepted write migrates once with `migratedFrom.fingerprint` + activity entry; `location.remoteOrigin` null in the sandbox and never feeds identity.
- **PRD-002 req 2** — Meets via the above. **ADR-0021** — Meets: candidate tested on disposable boards only; live board untouched; stable/candidate identity observable.
- No governing doc modified; no new ADR.

## Verification (cwd `.worktrees/core-114`)

| Command | Exit |
| --- | --- |
| `npm test -w @kanmer/core` — 19 files, 392 tests | 0 |
| `node packages/mcp-server/src/smoke.mjs` — 274/274 | 0 |
| `npm run smoke:protocol` — 50/50 | 0 |
| `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` × both smokes — 274/274, 50/50 | 0 |
| `npm run typecheck` — core, mcp-server, ui, gui | 0 |
| `npm run test:http -w @kanmer/mcp-server` | 0 |
| `npm run build && npm run plugin:build && npm run plugin:check` — 38 tools, bundle bytes match (run in the worktree, which has its own `node_modules`) | 0 |
| `npm run verify:skills` (after removing a `kanmer-loc-v1` token the skill-name checker misread) / `verify:docs` / `verify:agents-block` (31/31) / `smoke:headless` / `smoke:discovery` (13/13) / `mcpb:check` | 0 each |
| `npm run verify` | **1** — `npm test`: core 392 and GUI 493 passed; `test:scripts` failed on `antigravity-plugin-config.test.mjs` EBUSY rmdir `…\Kanmer Test Space\Kanmer\bin` (known host quirk, recorded not chased). The rail aborted there; every subsequent step was run individually above. Hosted `verify` is authoritative. |
| v0.3.12 compat proof (ad-hoc script, not committed): installed `resources/mcp/kanmer-mcp.cjs` v0.3.12 `get_status`/`list_items`/`get_item`/`update_item` against a candidate-written board with `project.json` + proof | 0 — `project.json` untouched, candidate re-reads the same `project_id` |

## Deviations

1. `smoke.mjs` "create_item rejects standalone plans": `plan.structuredContent === undefined` → `plan.structuredContent?.error === undefined && project present`. Intent (no error code) preserved; the FRD requires the project block on every result.
2. `store.test.ts` activity sequence gains the identity entry at index 0 (added an explicit assertion rather than loosening).
3. A dry-run `migrate_board` over MCP allocates identity because every write goes through the pre-existing lazy `ensureInit()` (which already writes `board.yml`/`version.json` on a fresh root). Core's `migrateBoard({dryRun:true})` itself does not write (unit test). Smoke documents this ordering.
4. HTTP readiness event keeps `projectFingerprint` only (plan step 9 "may add project_id" not done — `HttpReadyEvent` is a typed, tested contract; left additive for MCP-054).
5. `plugin:build`/`plugin:check` ran inside the worktree rather than the main checkout: the worktree has its own `node_modules` (`npm ci`) so the bundle resolves the worktree's core; check passed. The main checkout has unrelated uncommitted edits (`AGENTS.md`, `pr.yml`) and was not used.

## Risks / follow-ups

- `lastProject` snapshot in index.ts is per-process; correct because one process serves one project, but MCP-054 must re-resolve per endpoint.
- Revision recomputation reads every pipeline document on each CAS-guarded mutation — fine at ticket scale; watch if packets grow.
- Rollback = delete `project.json` → next write re-migrates a different uuid; anything that bound the old id (auto run records) must be re-bound. Documented in AGENTS.md §8.

## For kanmer-verify (on the merged SHA)

`npm run build`; `npm test -w @kanmer/core`; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`; `npm run typecheck`; `npm run plugin:check`; optionally re-run the v0.3.12 compat proof (candidate writes a board, installed stable server reads/writes it, `project.json` untouched). Confirm `get_status.project.project_id` is null (`unassigned`) on a fresh root before any write, and the live board on stable v0.3.12 is unaffected (no `project.json` appears there until an operator runs the candidate against it).

## Remediation round 1

Review `scratch/review.md` v90c6f088f8ec0f8b (needs-changes at e2bb6ed8). One remediation commit `631e3a0eef68da61c7d55c1d9948d6583db6f470` pushed to the same branch/PR #291 (`origin/main` unchanged at 3267c7df, no rebase needed). Worktree `.worktrees/core-114`.

### Findings resolved

| Finding | Resolution |
| --- | --- |
| F-001 (major) | `packages/core/src/project.ts` `allocateProjectRecord` now creates `project.json` with `io.ts` `writeFileExclusive` (temp + hard link, EEXIST on an existing target). On EEXIST it re-reads and returns `{ allocated: false, record: winner }`; `store.ensureProject` therefore logs the `board/project_id` activity entry only for the allocating caller. A pre-existing *malformed* file still yields a fresh allocation via `writeFileAtomic` (the accepted, documented fallback). Tests in `project.test.ts`: 8 concurrent `store.init({fallbackFingerprint})` on a legacy board → one uuid, one migration activity entry, every store reads the same id, no temp files left; 8 concurrent `allocateProjectRecord` → exactly one `allocated: true`; malformed file replaced. |
| F-002 (minor) | `packages/mcp-server/src/index.ts` `migrate_board` is registered with `guard` instead of `write()`, keeping the same order (`assertExpectedProject` → `setActor` → init) but calling `ensureInit()` only when `dry_run` is false. Smoke now asserts a legacy-board dry run returns `identity.wouldAllocate: true`, `project_id: null`, leaves no `project.json` and `get_status` still `unassigned`; the real migration then allocates once with exactly one activity entry for that id. Tool-reference row updated. |
| F-003 (minor) | New `redactRemoteOrigin` in `project-identity.ts` strips userinfo from `scheme://user:token@host/...` and the password segment from scp-like `user:token@host:path`; `resolveLocation` applies it before reporting and hashing. Smoke check covers https/ssh/scp/plain/empty/null. |
| F-004 (minor) | `store.releaseTicket(id, { expectedRevision })`, `renewTicket(id, actor, { expectedRevision })`, `TransferTicketInput.expectedRevision` all run `assertRevision` before any write; `take_ticket` forwards `expected_revision` on every action. Core test proves stale token → `Conflict:` with byte-identical ticket file and unchanged activity count, fresh token accepted; smoke proves `REVISION_CONFLICT` on renew/release/transfer with unchanged `get_item`. |
| F-005–F-007 | Accepted risk, no change. |

### Files changed this round

`packages/core/src/project.ts`, `project.test.ts`, `store.ts`, `types.ts`; `packages/mcp-server/src/index.ts`, `project-identity.ts`, `smoke.mjs`; `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`; regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`.

### Verification (cwd `.worktrees/core-114`, head 631e3a0e)

| Command | Exit |
| --- | --- |
| `npm test -w @kanmer/core` — 19 files, 396 tests | 0 |
| `node packages/mcp-server/src/smoke.mjs` — 278/278 | 0 |
| `npm run smoke:protocol` — 50/50 | 0 |
| `npm run test:http -w @kanmer/mcp-server` — 118 pass / 0 fail | 0 |
| `npm run plugin:build && npm run plugin:check` — 38 tools, bundle bytes match | 0 |
| `npm run typecheck` | 0 |
| `npm run verify` | **1** — core 396 and GUI 493 passed; `test:scripts` failed on the same known host quirk as round 0 (`antigravity-plugin-config.test.mjs` EBUSY rmdir `…\Kanmer Test Space\Kanmer\bin`, 2 tests). Recorded, not chased; every other rail step ran green individually above. Log `%TEMP%/core-114-verify-r1.log`. |

No existing assertion weakened; the two prior smoke checks around dry-run ordering were replaced by stricter ones (dry run must not write).
