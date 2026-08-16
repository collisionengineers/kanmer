---
status: approved
covers: shipped core (backfill); verified against code in Phase 0
---

# FRD-015 — Ticket & board core

The item model everything else stands on.

- R1. An item is Markdown + YAML frontmatter in its own folder under its area (`areas/<area>/<ID>/<ID>.md`); the body may reference items with `[[ID]]` wiki-links.
- R2. **Ids are immutable and area-born**: each area declares a prefix; per-prefix counters with on-disk reconcile; moving areas moves the folder, never the id, so links stay valid forever. Path traversal in ids is rejected.
- R3. Relations: `links:` (structured, target-must-exist), `blocks:` (dependency edges; blocked-by is derived, never stored), body wiki-links (reported as backlinks).
- R4. Fields: title, status, area, assignee, labels, groups (FRD-001), profile (FRD-002), refs/docs_todo, commits/prs, deployment (board-gated), taken state (FRD-016), archived, created/updated, manual `order`.
- R5. Writes are atomic (temp+rename), exclusive-create id allocation survives concurrent creates, no-op writes don't bump `updated`, and optimistic concurrency (`expected_updated`, doc versions) protects read-modify-write.
- R6. Every write validates field values against the board config; unknown values are rejected, never silently written.
- R7. **Archive is the human delete** (GUI Delete = Archive; archived items leave the board, live in the Archived view); `delete_item` is agent-only and destructive-annotated, cleans dangling links, reports body refs.

**Acceptance (as-built):** the existing vitest suites are this FRD's evidence — id race (10-way), traversal guard, no-op skip, link integrity, board validation, archive semantics.

Related: README data model · kanmer-upgrades Phases 1–2 · FRD-001/002/016.

## Verified against code — Phase 0.2

All anchors in `packages/core/src/`.

- R1 — layout `areas/<area>/<ID>/<ID>.md` from `resolvePaths` `paths.ts:20-37`; wiki-links parsed
  by `WIKILINK_RE` `links.ts:5-15`.
- R2 — area prefix 2–6 uppercase alphanumerics `types.ts:14-29`, derived by `areaPrefix`
  `board.ts:53-57`, uniqueness enforced on every board write by `assertUniquePrefixes`
  `board.ts:66-91`; per-prefix counters with on-disk reconcile `ids.ts:108-157`; moving area moves
  the folder, never the id (`updateItem` area path, `store.ts`); traversal rejected by `SAFE_ID_RE`
  + `assertSafeId` `paths.ts:50-62`.
- R3 — `links`/`blocks` frontmatter `types.ts:218-254`; `blockedBy` derived, never stored
  `links.ts:29-55`; backlinks from body wiki-links `links.ts:18-22`.
- R4 — every field on `ItemFrontmatterSchema` `types.ts:218-254`. Note `groups` and `profile` are
  **v3 additions and not yet present** — they arrive in Phase 2.
- R5 — `writeFileAtomic` / `writeFileExclusive` `io.ts:64-81`; create retried `CREATE_ATTEMPTS`
  times `store.ts:71`; no-op patches skip disk and leave `updated` alone (tested
  `store.test.ts:176`); `expectedUpdated` conflict `store.test.ts:193`; doc version hash
  `io.ts:11-13`.
- R6 — `assertFieldAgainstBoard` `store.ts:1169-1182`, `assertDeploymentAgainstBoard`
  `store.ts:1197-1211`, `assertRefs` `store.ts:1009-1016`.
- R7 — `archived` is a frontmatter flag `types.ts:249`, filtered by `matchesFilter`
  `store.ts:1231`; `deleteItem` removes the folder and cleans dangling links `store.ts:958-987`,
  annotated destructive and elicitation-guarded at `mcp-server/src/index.ts:799-822`.
- Acceptance — the suites named are real: id race, traversal guard, no-op skip, link integrity,
  board validation and archive semantics all live in `store.test.ts` (1048 lines).
