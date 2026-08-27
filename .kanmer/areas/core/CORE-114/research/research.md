# Research — CORE-114 logical project identity and revision-safe mutations

## Question

How do we give a board a stable logical `project_id` (separate from its machine-local location), make every MCP response carry it, make every mutation project- and revision-safe (including document writes), and migrate a legacy board once — all while the live board stays readable by the installed stable v0.3.12 server and the existing MCP contract keeps working?

## Governing inputs

- FRD-029 (`docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md`) — acceptance 1-3 and 5 plus both edge cases are this ticket; acceptance 4 (named endpoints/registry) is MCP-054.
- PRD-002 requirement 2; ADR-0021 (candidate never controls the live board; identity must be observable).
- HZN-008 `context.md`: "Mutations use logical-project validation plus revision/lease CAS; a request never chooses an arbitrary project path"; CORE-114 "establishes project identity and a document-inclusive revision contract".
- CORE-113 `scratch/notes.md` + Outcome: F-015 = a proof write happens outside the ticket CAS because `setDoc` never bumps `item.updated`. CORE-114 must close it with a document-inclusive revision.

## Findings

### F1 — Current identity is a location hash, not a logical identity
`packages/mcp-server/src/project-identity.ts` derives `kanmer-proj-v1:<sha256>` from canonical `boardRoot`, `format`, `repoRoot`. Any copy of the board at another path gets a different fingerprint, so it cannot satisfy FRD-029 acceptance 1. It is exactly the "location fingerprint" the FRD wants kept separately (and `smoke.mjs` lines 160-230 pin its byte contract). Consumers: `index.ts` (`write()` wrapper line ~430, `get_status.project`, `get_execution_packet`, `dispatch_task`, `cancel_dispatch`, `projectFingerprint()` used by HTTP readiness), `execution-packet.ts` (uses `project.repoRoot`/`boardRoot` for worktree canonicalisation — keep the `ProjectIdentity` shape additive).

### F2 — Nothing on disk is safe for v0.3.12 except a new file
- `BoardConfigSchema` (`types.ts` 339) is a plain `z.object` — zod strips unknown keys, and `writeBoard` re-serialises the parsed object. A `project` key in `board.yml` would be silently dropped the first time stable v0.3.12 runs `add_column`/`set_sources`. Rejected.
- `version.json`: `readVersion` tolerates extra keys, but `writeVersion` in migration rewrites `{format, migratedFrom, migratedAt}`. Fragile. Rejected.
- Ticket frontmatter is `.passthrough()` and `orderKeys` preserves extras, so extra keys survive v0.3.12 rewrites — usable, but per-ticket, not board-level.
- Decision: persist identity in a new `.kanmer/project.json` (`{ schema: 1, project_id, board_id?, created, origin: "generated"|"migrated", migratedFrom: {...fallback evidence} }`). v0.3.12 never reads or writes it; no format bump; no migration of ticket files. `resolvePaths` gains `projectFile`.

### F3 — Legacy migration = first-write / explicit migration, never a read side effect
`ensureInit()` in index.ts runs `store.init()` lazily on the first write; read-only sessions must not create files (ADR-0012 discipline, `smoke-discovery` asserts no-board no-write). `migrate_board` already exists as the agent route. So: a board without `project.json` reports `project.project_id: null` with `identity: "unassigned"` and the location fingerprint as the auditable fallback; `store.init()` (first write) and `migrateBoard` allocate the UUID once, write `project.json` with `origin: "migrated"` and `migratedFrom.fingerprint`, and append an activity entry so it is auditable. That satisfies the FRD edge case ("one-time identity migration with an auditable fallback; does not retain two permanent identity models") — the fingerprint stays as *location evidence*, not identity.

### F4 — Revision today: `updated` for frontmatter, `contentVersion` per document; no ticket-wide token
- `store.updateItem`/`moveItem`/`updateGroup` compare `expectedUpdated` to `item.updated` and throw `Conflict: ...` (wording pinned by tests/smoke; `errors.ts` classifies `Conflict:` → `REVISION_CONFLICT`).
- `setDoc` CAS is per-file (`expectedVersion` vs `contentVersion(existing)`) and does NOT touch `item.updated`, so a proof/review rewrite is invisible to a ticket-level CAS (F-015).
- Document inventory already exists: `documentInventory(ticketDir)` (docpaths.ts) and `store.listTicketDocsWithVersions(id)` enumerate every Markdown document by type-relative path with a `contentVersion`.
- Decision: a **computed** document-inclusive `revision` = hash over (ticket file bytes + sorted `[path, contentVersion]` of every inventory document, excluding `scratch/` and `reference/` which are gate-exempt notes/inputs). Computed on read, never stored, so v0.3.12 boards need no rewrite and the token changes whenever any pipeline document (proof, plan, review record) changes. `expected_revision` on mutations is checked by recomputing before the write. `updated`/`expected_version` keep working unchanged (additive contract).

### F5 — Every response must name the project
`ok()` (index.ts 180) builds a text JSON result only; `structuredContent` is used only for errors (`failCoded`). Adding a `project` member to every JSON payload would break clients parsing exact shapes (smoke.mjs does deep field checks, GUI does not consume MCP). Least-invasive path that meets "every response identifies the logical project": add `structuredContent: { project: { project_id, fingerprint } }` (or `_meta`) alongside the unchanged text content in `ok()` and in `failCoded` — protocol-legal, additive, zero change to text payloads. Note: MCP SDK validates `structuredContent` against `outputSchema` only when an `outputSchema` is declared; none is declared here.

### F6 — `expected_project` must accept the logical id and stay optional this release
`write()` wrapper compares `expected_project` to the fingerprint string. Live skills (`kanmer-execute`, `kanmer-auto` run records, tool-reference.md line 34) and `smoke.mjs`/`smoke-protocol.mjs` assert the field is optional and send fingerprints. Making it required would break every installed v0.3.12 skill immediately. Decision: accept either the `project_id` (preferred) or the legacy location fingerprint; report `compat.expectedProject: "optional"` unchanged plus `compat.projectIdentity: "logical"`; `WRONG_PROJECT` message names both what was sent and what the project is. Hardening to required is MCP-054 territory (the FRD's endpoint work) — recorded in open-questions as a parked decision.

### F7 — Location fingerprint inputs are all already obtainable in the server
`inspectBoardBranch` and `inspectBoardSync` (index.ts 62-115) already shell out to git with `windowsHide` and swallow failures; `remote.origin.url` is one more `git config --get remote.origin.url`; machine = `os.hostname()`; paths = `projectRoot` and `store.paths.repoRoot`. Any missing value is reported as `null` ("reported as location evidence, never reassigns the project").

### F8 — One process, one project
`resolveRoot()` fixes `projectRoot` at boot; no tool schema takes a path (reconcile_ticket description explicitly says so; `smoke-discovery` covers root resolution). Nothing to change; add a smoke assertion that no mutating tool schema has a `root`/`path`/`project_root` property.

### F9 — Existing test surfaces to extend
- core: `store.test.ts` (CAS/`Conflict` wording), `migrate.test.ts`, `discover.test.ts`; vitest serial.
- server: `smoke.mjs` (fingerprint contract, WRONG_PROJECT, Conflict), `smoke-protocol.mjs` (write schemas expose optional `expected_project` only), `http.test.mjs` (readiness uses `projectFingerprint()`).
- Plugin bundle: `npm run plugin:build && npm run plugin:check` must be rerun from the main checkout after any server change; `tool-reference.md` must describe new fields or `plugin:check` drift/skill verification fails.

## Implications for this ticket

1. No storage format bump. `CURRENT_FORMAT` stays 3; identity lives in `.kanmer/project.json`; revision is computed. A v0.3.12 board stays readable and a v0.3.12 server ignores the new file.
2. Core owns identity + revision (`packages/core/src/project.ts` new, `store.ts` additions); the server owns location fingerprint, response decoration and the `expected_project`/`expected_revision` guards.
3. The `Conflict:` message prefix must be reused for revision conflicts so `errors.ts` classification, tests and skills keep working.
4. Skills docs (`tool-reference.md`, `kanmer-execute` orientation) gain the new fields; AGENTS.md §4/§8 gain a line on `project.json` and the revision token.
