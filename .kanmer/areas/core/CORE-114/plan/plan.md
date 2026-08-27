# Plan — CORE-114: Add logical project identity and revision-safe mutation contracts

## Objective

One PR that (a) persists a stable logical `project_id`/`board_id` on the board, (b) reports a separate machine-local location fingerprint, (c) identifies the logical project on every MCP response, (d) lets every mutation carry `expected_project` (logical id or legacy fingerprint) and a document-inclusive `expected_revision`, refusing with structured `WRONG_PROJECT` / `REVISION_CONFLICT` before any write, and (e) migrates a legacy board's identity once with an auditable fallback — all without a storage-format bump, so the installed stable v0.3.12 server keeps reading the live board.

## Starting state

- `packages/mcp-server/src/project-identity.ts`: `kanmer-proj-v1:<sha256(boardRoot, format, repoRoot)>` — a location hash used as "project" by `write()` (index.ts ~430), `get_status.project`, `get_execution_packet`, `dispatch_task`, `cancel_dispatch`, HTTP readiness (`projectFingerprint()`). `smoke.mjs` pins its bytes.
- `packages/core/src/store.ts`: `expectedUpdated` CAS on `updateItem`/`moveItem`/`updateGroup` (throws `Conflict: ...`), per-document `expectedVersion` CAS in `setDoc`; `setDoc` does not bump `item.updated` (F-015).
- `packages/core/src/docpaths.ts` `documentInventory` enumerates every Markdown document by type-relative path; `scratch`/`reference` are gate-exempt.
- `errors.ts` classifies `Conflict:` → `REVISION_CONFLICT`; `WRONG_PROJECT`, `GATE_BLOCKED` exist. `ok()` returns text-only results; `structuredContent` only on errors.
- `BoardConfigSchema` strips unknown keys (board.yml cannot host identity); `version.json` is rewritten by migration; ticket frontmatter passes extra keys through.
- Format is 3 (`CURRENT_FORMAT`); `ensureInit()` runs `store.init()` on the first write only; `migrate_board` is the explicit agent migration route and short-circuits when `alreadyV3`.
- Root is fixed at boot (`resolveRoot()`); no tool takes a path.

## Governing docs

- FRD-029 — **Meets** acceptance 1 (copied checkouts keep `project_id`, differ in `location`), 2 (every response carries `structuredContent.project`; wrong `expected_project` refused before `ensureInit`), 3 (stale `expected_revision` → `REVISION_CONFLICT`, board untouched), 5 (no write schema has a path property; asserted by smoke). Acceptance 4 (named endpoints) is MCP-054 and untouched. Edge cases: one-time identity allocation with `origin: "migrated"` + `migratedFrom.fingerprint` and an activity entry; missing/changed origin reported as `location.remoteOrigin: null|value`, never reassigning identity.
- PRD-002 requirement 2 — **Meets** via the above.
- ADR-0021 — **Meets**: no live-board takeover; candidate tested on disposable boards; stable/candidate identity observable through `get_status.server` + `project`.
- No governing doc is modified; no new ADR (the decisions are recorded in `open-questions` Parked and the plan).

## Required changes

### Core (`@kanmer/core`)
1. `paths.ts`: `projectFile = <kanmer>/project.json`.
2. New `project.ts`:
   - `ProjectRecord { schema: 1; project_id: string; board_id: string; created: string; origin: "generated" | "migrated"; migratedFrom?: { fingerprint?: string; format: number; at: string } }`.
   - `readProjectRecord(paths)` → record | null (tolerant of malformed → null).
   - `allocateProjectRecord(paths, opts: { origin, format, fallbackFingerprint? })` — `randomUUID()`, `board_id = project_id`, atomic write, idempotent (returns existing if present).
   - `computeRevision(itemText, docs: {path, version}[])` → `rev1:<sha256 hex[0..16]>` over the ticket file bytes and the sorted `[path, contentVersion]` pairs, excluding `scratch/` and `reference/` paths.
3. `store.ts`:
   - `getProject()` → record | null; `ensureProject(opts)` wraps allocation and appends an activity entry `{ id: "board", field: "project_id", to: <id>, reason: origin }` (use the existing activity shape; entity id `board`).
   - `init()` calls `ensureProject({ origin: "migrated" | "generated" })` — `migrated` when the board already exists (has `board.yml`, `areas/` or `version.json`), else `generated`. `fallbackFingerprint` is supplied by the caller through a new optional `init({ fallbackFingerprint })` argument (core must not compute the server's fingerprint).
   - `getRevision(id)` → `{ revision, updated, documents: number } | null` (null for legacy layout).
   - `expectedRevision?: string` accepted on `UpdateItemPatch`, `moveItem` options, `TakeTicketInput`, `SetDocOptions`, `linkDoc`, `linkItems`, `appendScratch`: computed from the current on-disk state immediately before the write (after the existing validation/gate reads, alongside the `expectedUpdated` check) and refused with `Conflict: "<id>" revision changed since you read it (revision is now <r>, you expected <e>). Re-read the item and re-apply your change.` Nothing is written on refusal.
   - `getItem` result is unchanged (no serialised field); the server composes `revision` beside the item.
4. `migrate.ts`: `migrateBoard` returns an additional `identity: { allocated: boolean; project_id: string | null; origin }` and allocates (non-dry-run) even when `alreadyV3`; dry run reports `allocated: false, wouldAllocate: true`.
5. `index.ts` exports.

### MCP server
6. `project-identity.ts` (bytes of `kanmer-proj-v1` unchanged): add `LocationFingerprint { repoPath, boardPath, machine, boardBranch, remoteOrigin, fingerprint }` and `logicalProjectView(record, location)`; `location.fingerprint` = `kanmer-loc-v1:<sha256>` over the canonical values with nulls preserved.
7. `index.ts`:
   - `resolveProject()` helper: `{ project_id, board_id, identity: "logical" | "unassigned", fingerprint, location }` used by every decoration.
   - `ok()` adds `structuredContent: { project: { project_id, board_id, fingerprint } }` (text payload unchanged); `guard`/`failCoded` add the same block on errors (`errors.ts` gains an optional `project` argument). Read tools include it too — "every response".
   - `write()`: `expected_project` matches when it equals `project_id` OR the legacy location fingerprint; mismatch → `WRONG_PROJECT` naming the accepted forms, raised before `store.setActor`/`ensureInit`. An `expected_project` naming a `project_id` while the board is still `unassigned` is `WRONG_PROJECT` (an id cannot be guessed before allocation).
   - `expected_revision` (optional string, described) on `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `append_scratch`, `link_doc`, `link_items`; passed as `expectedRevision`.
   - `get_status`: `project` gains `project_id`, `board_id`, `identity`, `origin`, `location`; `compat` gains `projectIdentity: "logical"`, `expectedRevision: "optional"`. Description text updated.
   - `get_item` returns `{ ...item, revision }` (the JSON payload; `revision` is never written to frontmatter); `get_execution_packet` packet gains `project_id` and `ticket.revision`.
   - `ensureInit()` passes the current location fingerprint as `fallbackFingerprint`.
   - `migrate_board` description mentions identity allocation.
8. `execution-packet.ts`: carry `project_id`/`revision` (read-only).
9. HTTP readiness keeps `fingerprint`; add `project_id` when assigned (additive).

### Docs and plugin
10. `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`: `expected_project` accepts `project_id`; new `expected_revision`; `REVISION_CONFLICT`; `structuredContent.project`. `kanmer-execute/SKILL.md` orientation: prefer `project.project_id`, read `revision` from `get_item` before doc writes.
11. AGENTS.md §4 (layout: `.kanmer/project.json`) and §8 (revision excludes scratch/reference; v0.3.12 ignores project.json).
12. `npm run plugin:build` from the main checkout → committed bundle.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Add | `packages/core/src/project.ts`, `packages/core/src/project.test.ts` | identity record + revision hash |
| Modify | `packages/core/src/paths.ts`, `store.ts`, `migrate.ts`, `types.ts`, `index.ts` | persistence, CAS, migration report |
| Modify | `packages/core/src/store.test.ts`, `migrate.test.ts` | CAS + allocation tests |
| Modify | `packages/mcp-server/src/project-identity.ts`, `index.ts`, `errors.ts`, `execution-packet.ts`, `http.ts` (if readiness shape lives there) | location fingerprint, decoration, guards |
| Modify | `packages/mcp-server/src/smoke.mjs`, `smoke-protocol.mjs` | new contract checks |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `AGENTS.md` | contract docs |
| Generated | `plugins/kanmer/mcp/*.cjs` | via `npm run plugin:build` (main checkout) |

## Do not modify

- `.worktrees/kanmer` board worktree (never check out/rebase/push/remove); the live board files.
- `CURRENT_FORMAT`, `version.json` shape, ticket frontmatter serialisation, `board.yml` schema.
- The `kanmer-proj-v1` payload bytes; the `Conflict:` prefix; existing `expected_updated`/`expected_version` semantics.
- Lease/batch (CORE-115), delivery (CORE-116), registry/endpoints (MCP-054), GUI.
- Any existing test assertion (never weaken).

## Constraints

- v0.3.12 compatibility: the only new on-disk artefact is `.kanmer/project.json`; all MCP additions are optional inputs or additive outputs.
- Refusals happen before `ensureInit()` and before any file write; no partial writes on `REVISION_CONFLICT`.
- Core never spawns git; location evidence is server-side with swallowed failures (`null`).
- Windows host: use `windowsHide`, atomic writes via `writeFileAtomic`.
- Worktree `.worktrees/core-114` branched from `origin/main` (3267c7df); `plugin:check` must run from the main checkout.

## Ordered steps

1. Create worktree/branch `core-114-project-identity` at `origin/main`; `take_ticket` with branch + worktree.
2. Core `paths.ts` + `project.ts` + unit tests (allocation idempotent, malformed → null, revision changes on doc content change, unchanged when only scratch changes).
3. Core `store.ts`: `getProject`, `ensureProject`, `init` hook, `getRevision`, `expectedRevision` on each mutating method; tests in `store.test.ts` (stale revision refused with `Conflict`, file unchanged; proof rewrite changes `getRevision`).
4. Core `migrate.ts` identity report + test; `index.ts` exports; `npm run build:core`.
5. Server `project-identity.ts` location fingerprint; `index.ts` `resolveProject`, `ok`/`failCoded` decoration, `write()` acceptance rules, `expected_revision` fields, `get_status`/`get_item`/packet fields, `ensureInit` fallback; `errors.ts`.
6. Smoke additions in `smoke.mjs`: copy sandbox to a second path and assert equal `project_id`, different `location.fingerprint`; `expected_project = project_id` accepted; `kanmer-proj-v1:wrong` and `wrong-uuid` refused before init; stale `expected_revision` on `set_ticket_doc` and `update_item` → `REVISION_CONFLICT` and files unchanged; `set_ticket_doc proof` changes `get_item.revision`; every mutating schema lacks `root|path|project_root|board_root` properties; `structuredContent.project.project_id` present on a read and a write result. `smoke-protocol.mjs`: `expected_revision` optional where present.
7. Docs: tool-reference, kanmer-execute, AGENTS.md.
8. `npm run build && npm run plugin:build && npm run plugin:check` from the main checkout (copy bundle back into the worktree branch if built there); commit.
9. Full rail: `npm run verify` (600 s timeout, foreground); record known host quirks if they trip.
10. Push, open PR with body ending in a standalone `Kanmer: CORE-114` footer; write post-implementation report; move to Review.

## Acceptance checks

- Production entry: `createKanmerMcpServer` (index.ts) is the composition root; `store.init()` is the allocation caller; `migrateBoard` the explicit one.
- Packaged artefact: `plugins/kanmer/mcp/kanmer-mcp.cjs` rebuilt and `plugin:check` green; `smoke.mjs` with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs` green.
- Schema/migration: `project.json` additive; rollback = delete the file (identity regenerates as `migrated` again — recorded in AGENTS.md); no data loss; a v0.3.12 board is proven readable by running the installed `C:/Users/Alex/AppData/Local/Programs/Kanmer/resources/mcp/kanmer-mcp.cjs` (`KANMER_SERVER=...` smoke or a manual `get_status`) against a sandbox that has `project.json`.
- Tests prove the claims with exact commands and exit codes in the report.

## Commands

- `npm run build:core`; `npm test -w @kanmer/core`; `npm run build`; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`; `npm run typecheck`; `npm run verify:skills`; `npm run plugin:build && npm run plugin:check` (main checkout); `npm run verify` (full rail, foreground, 600 s).

## Failure and deviation rules

Stop and report: any existing assertion that would need weakening; a required storage-format bump; a governing-doc conflict; `plugin:check` refusing outside the main checkout with no workaround; GUI changes becoming necessary. Host quirks listed in the run brief are recorded, not chased.

## Stop condition

PR open against `main` with a standalone `Kanmer: CORE-114` footer, ticket in Review, post-implementation report written. No review, merge, verify, closeout or other ticket.
