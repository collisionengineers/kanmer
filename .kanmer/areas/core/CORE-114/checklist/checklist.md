# Checklist — CORE-114

- [x] Worktree `.worktrees/core-114` on branch `core-114-project-identity` from `origin/main`; ticket taken with branch + worktree recorded.
- [x] `paths.ts` exposes `projectFile`; `project.ts` adds `readProjectRecord`, `allocateProjectRecord`, `computeRevision` with unit tests (idempotent allocation, malformed → null, revision changes on doc change, not on scratch).
- [x] `store.ts`: `getProject`, `ensureProject` (activity entry), `init({ fallbackFingerprint })` allocates once with `origin` migrated/generated, `getRevision(id)`.
- [x] `store.ts`: `expectedRevision` refused with `Conflict:` on `updateItem`, `moveItem`, `takeTicket`, `setDoc`, `appendScratch`, `linkDoc`, `linkItems` before any write; tests prove file bytes unchanged and that a proof rewrite changes `getRevision`.
- [x] `migrate.ts`: `migrateBoard` reports/allocates `identity` even when `alreadyV3`; dry run does not write; test added.
- [x] `project-identity.ts`: `kanmer-proj-v1` bytes unchanged; `locationFingerprint` (repo path, board path, machine, board branch, remote origin) added.
- [x] `index.ts`: every `ok()`/error result carries `structuredContent.project.{project_id,board_id,fingerprint}`; `write()` accepts `project_id` or fingerprint and refuses `WRONG_PROJECT` before `ensureInit`.
- [x] `index.ts`: `expected_revision` on update_item, move_item, take_ticket, set_ticket_doc, append_scratch, link_doc, link_items; `get_status.project` gains project_id/board_id/identity/origin/location and `compat` gains `projectIdentity`/`expectedRevision`; `get_item` and execution packet expose `revision`.
- [x] `smoke.mjs`: copied board keeps `project_id` and differs in `location.fingerprint`; project_id accepted; wrong id/fingerprint refused pre-init; stale `expected_revision` → `REVISION_CONFLICT` with unchanged files; proof rewrite changes `revision`; no mutating schema has a path property; `structuredContent.project` on read and write. `smoke-protocol.mjs` covers optional `expected_revision`.
- [x] Docs: `tool-reference.md`, `kanmer-execute/SKILL.md`, AGENTS.md §4/§8 (project.json, revision scope, rollback = delete file).
- [x] [pre-review] `npm run build && npm run plugin:build && npm run plugin:check`; bundle committed (ran in the worktree, which has its own `node_modules` after `npm ci`; plugin-sync OK, 38 tools, bundle bytes match).
- [x] [pre-review] Installed stable `kanmer-mcp.cjs` (v0.3.12) reads a sandbox board that carries `project.json` (`get_status`, `list_items`, `get_item`, `update_item` ok; project.json untouched) — evidence in the report.
- [x] [pre-review] Exact commands with exit codes: `npm test -w @kanmer/core` 0, `node packages/mcp-server/src/smoke.mjs` 0, `npm run smoke:protocol` 0, `npm run typecheck` 0, `npm run verify` 1 (known antigravity EBUSY script quirk after core+GUI suites passed; remaining rail steps rerun individually, all 0) — see post-implementation report.
- [x] [pre-review] PR open with standalone `Kanmer: CORE-114` footer (https://github.com/collisionengineers/kanmer/pull/291, head e2bb6ed8); post-implementation report written; ticket moved to Review. Stop.

## Progress notes

- 2026-08-27 commit e2bb6ed8 on `core-114-project-identity`; `npm run verify` run (log `%TEMP%/core-114-verify.log`).
- 2026-08-27 verification complete: core 392/392, smoke 274/274, protocol 50/50, typecheck 4/4, plugin:check OK, bundle smokes OK, v0.3.12 compat proof OK; `npm run verify` exit 1 on the known antigravity EBUSY script quirk after core+GUI suites passed (all later steps rerun individually, exit 0).

- [x] [remediation 1] F-001 exclusive allocation + concurrency tests; F-002 read-only dry-run migrate + smoke; F-003 origin userinfo redaction + smoke; F-004 expected_revision on release/renew/transfer + core/smoke tests. Commit 631e3a0e pushed to PR #291; core 396/396, smoke 278/278, protocol 50/50, http 118/0, plugin:check OK, typecheck 0, verify 1 (known antigravity EBUSY quirk).

## Closeout — CORE-114

- [x] PR merge verified (`gh pr view --json state,mergedAt`) — MERGED 2026-08-27T19:04:35Z, merge 97dfc9f3
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage (Done, by kanmer-verify)
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/core-114` (+ verify worktree)
- [x] `git branch -D core-114-project-identity` (squash-merged) + `git push origin --delete`
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
