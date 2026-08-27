# Checklist — CORE-114

- [ ] Worktree `.worktrees/core-114` on branch `core-114-project-identity` from `origin/main`; ticket taken with branch + worktree recorded.
- [ ] `paths.ts` exposes `projectFile`; `project.ts` adds `readProjectRecord`, `allocateProjectRecord`, `computeRevision` with unit tests (idempotent allocation, malformed → null, revision changes on doc change, not on scratch).
- [ ] `store.ts`: `getProject`, `ensureProject` (activity entry), `init({ fallbackFingerprint })` allocates once with `origin` migrated/generated, `getRevision(id)`.
- [ ] `store.ts`: `expectedRevision` refused with `Conflict:` on `updateItem`, `moveItem`, `takeTicket`, `setDoc`, `appendScratch`, `linkDoc`, `linkItems` before any write; tests prove file bytes unchanged and that a proof rewrite changes `getRevision`.
- [ ] `migrate.ts`: `migrateBoard` reports/allocates `identity` even when `alreadyV3`; dry run does not write; test added.
- [ ] `project-identity.ts`: `kanmer-proj-v1` bytes unchanged; `locationFingerprint` (repo path, board path, machine, board branch, remote origin) added.
- [ ] `index.ts`: every `ok()`/error result carries `structuredContent.project.{project_id,board_id,fingerprint}`; `write()` accepts `project_id` or fingerprint and refuses `WRONG_PROJECT` before `ensureInit`.
- [ ] `index.ts`: `expected_revision` on update_item, move_item, take_ticket, set_ticket_doc, append_scratch, link_doc, link_items; `get_status.project` gains project_id/board_id/identity/origin/location and `compat` gains `projectIdentity`/`expectedRevision`; `get_item` and execution packet expose `revision`.
- [ ] `smoke.mjs`: copied board keeps `project_id` and differs in `location.fingerprint`; project_id accepted; wrong id/fingerprint refused pre-init; stale `expected_revision` → `REVISION_CONFLICT` with unchanged files; proof rewrite changes `revision`; no mutating schema has a path property; `structuredContent.project` on read and write. `smoke-protocol.mjs` covers optional `expected_revision`.
- [ ] Docs: `tool-reference.md`, `kanmer-execute/SKILL.md`, AGENTS.md §4/§8 (project.json, revision scope, rollback = delete file).
- [ ] [pre-review] `npm run build && npm run plugin:build && npm run plugin:check` from the main checkout; bundle committed.
- [ ] [pre-review] Installed stable `kanmer-mcp.cjs` (v0.3.12) reads a sandbox board that carries `project.json` (`get_status` ok) — evidence in the report.
- [ ] [pre-review] Exact commands with exit codes: `npm test -w @kanmer/core`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`, `npm run typecheck`, `npm run verify` (host quirks recorded, not chased).
- [ ] [pre-review] PR open with standalone `Kanmer: CORE-114` footer; post-implementation report written; ticket in Review. Stop.

## Progress notes
