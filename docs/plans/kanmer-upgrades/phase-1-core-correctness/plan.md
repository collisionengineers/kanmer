# Phase 1 — Core correctness & safety

**Goal:** close the data-integrity holes in `packages/core` and `packages/mcp-server` so agents get self-correcting errors instead of silent corruption. All items are independent of the v2 restructure; land first. Effort: S ≈ half day, M ≈ ~1 day, L ≈ 2–3 days.

**Depends on:** nothing. **Feeds:** every later phase.

## Items

### 1.1 Validate `status` / `area` / `priority` against the board on write — S
- **Where:** `packages/core/src/store.ts` (`createItem`, `updateItem`; `moveItem` delegates so it's covered). New private helper, e.g. `assertFieldAgainstBoard(board, kind, value)`.
- **How:** when a patch/input includes one of these fields, check the id exists in `board.statuses` / `board.areas` / `board.priorities`. Error message must list valid ids so the model self-corrects: `Unknown status "qa". Valid statuses: todo, planning, implementing, review, verifying, done`. `guard()` in `packages/mcp-server/src/index.ts` already surfaces it as `isError` text.
- **Rules:** `area: ""` stays legal (boards may have no areas); only validate non-empty areas and only when `board.areas` is non-empty. Validate only fields being written — legacy items already in phantom stages stay editable/movable.
- **Also:** replace the hardcoded `priority ?? "medium"` default (store.ts:122) with board-derived: `"medium"` if that id exists, else the middle entry of `board.priorities`.

### 1.2 Path-traversal fix — S
- **Where:** `packages/core/src/paths.ts` `itemFile()`; export `assertSafeId(id)`.
- **How:** reject ids not matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`; explicitly reject any `..` substring; after `path.join`, assert `path.resolve(result)` stays inside the resolved type dir. Throwing from `itemFile` covers every consumer (`findFile`, `getItem`, `updateItem`, `deleteItem`, `createItem`). Ids come straight from model output — this is a real hole today (`delete_item` with a traversing id can remove `.md` files anywhere the process can reach).

### 1.3 No `updated` bump on no-op writes — S
- **Where:** `packages/core/src/store.ts` `updateItem`.
- **How:** after building `next` (before stamping `updated`), field-compare the pruned patch against `current` (body trimmed the same way `serialiseItem` does). If nothing differs, return `current` without writing. Repairs the standup staleness heuristic and stops watcher churn in the GUI.

### 1.4 `link_items` target must exist — S
- **Where:** `packages/core/src/links.ts` `linkItems`; also validate `links[]` arrays in `store.createItem`.
- **How:** on `action: "add"`, `getItem(targetId)` must return non-null, else `No item with id "TICK-999" to link to`. Leave `remove` permissive so dangling links can be cleaned. Body `[[wiki-links]]` stay unvalidated — they are prose.

### 1.5 `delete_item` cleans dangling links — S/M
- **Where:** `packages/core/src/store.ts` `deleteItem` (reuse `buildLinkIndex` from `links.ts`); `delete_item` description/return in `packages/mcp-server/src/index.ts`.
- **How:** after removing the file, rewrite the `links[]` of any item that referenced the deleted id (via `updateItem`, so no-op logic and timestamps apply). Leave body `[[wiki-links]]` untouched. Return `{ deleted, cleanedLinks: [...], bodyReferencesRemain: [...] }` so the agent can report residue.

### 1.6 Surface malformed-file / filename-id-mismatch warnings — M
- **Where:** `packages/core/src/store.ts` — new `listItemsWithWarnings()` returning `{ items, warnings: {file, message}[] }` (existing `listItems` signature preserved for GUI callers); `list_items` in the server appends `warnings` when non-empty.
- **How:** collect the currently-swallowed catch in the readdir loop instead of dropping it. Detect filename/id mismatch (`parsed.id !== basename(name, ".md")`) and warn "rename file to <id>.md". `list_board` gains `source: "file" | "default"` so an agent can tell a synthesized default board from a real one.

### 1.7 Optimistic concurrency (opt-in) — M
- **Where:** `packages/core/src/types.ts` (`UpdateItemPatch` gains `expectedUpdated?`), `store.ts` `updateItem`, server `update_item`/`move_item` gain optional `expected_updated`.
- **How:** if provided and `current.updated !== expectedUpdated`, throw a conflict error embedding the fresh frontmatter (JSON) + instruction "re-read, re-apply your change". Optional param preserves back-compat — GUI and casual calls keep last-write-wins. `kanmer-workflow` skill later tells agents to pass the `updated` they read from `get_item` when rewriting bodies.

### 1.8 Create race fix: exclusive create — M
- **Where:** `packages/core/src/io.ts` (new `writeFileExclusive`), `ids.ts`, `store.ts` `createItem`.
- **How:** the item file itself is the lock. Write temp file, then `fs.link(tmp, target)` (atomic, fails `EEXIST` if target exists — works on NTFS), unlink tmp; fall back to `fs.writeFile(file, { flag: "wx" })` where `link` is unavailable. `createItem` loops (bounded ~10): allocate candidate id, attempt exclusive create; on `EEXIST` recompute and retry. Update `counters.json` best-effort after a successful claim — the on-disk max reconcile already makes counters self-healing.
- **Why not a lockfile:** lockfiles need stale-lock timeouts and break on crash mid-hold; exclusive-create is crash-safe and keeps `io.ts` the only file-touching layer. Note this in AGENTS.md (which currently suggests a lockfile).
- **Sequencing:** lands together with Phase 2's per-prefix counters to avoid doing the id work twice.

## Release rail
Core changes compile into the plugin bundle: after landing, `npm run build && npm run plugin:build && npm run plugin:check`. Tool-reference notes: invalid-id rejection behavior, `expected_updated` params, `delete_item` return shape, `list_items` warnings.

## Verification
- vitest (`packages/core/src/store.test.ts` + friends): validation error lists valid ids; traversal ids rejected from every store method; no-op update leaves `updated` and file mtime unchanged; concurrent `createItem` (Promise.all ×10) yields unique ids, no lost files; link add to missing target rejected; delete cleans referencing `links[]`; malformed fixture file appears in warnings.
- `packages/mcp-server/src/smoke.mjs`: bad-stage `move_item` returns the valid-list error; `expected_updated` mismatch returns conflict payload.
