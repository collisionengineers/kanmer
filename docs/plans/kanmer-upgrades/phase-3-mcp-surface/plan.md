# Phase 3 — MCP surface v2 + 2026-07-28 modernization

**Goal:** expose the v2 model over MCP (take, docs, status, bulk, board management) and modernize the server for the MCP 2026-07-28 spec. All in `packages/mcp-server` (+ small core additions and one GUI-main fix).

**Depends on:** Phases 1–2. **Feeds:** Phases 7–8.
**Rail:** every tool listed needs a `tool-reference.md` row (`scripts/check-plugin-sync.mjs` gates names) + bundle rebuild.

## New / changed tools

- **`get_status`** — S. Returns `projectRoot`, `.kanmer` path, format version, whether boot created `.kanmer/` (record a boolean in `main()` before `store.init()`), board `source: file|default`, per-stage/per-type counts, archived count, warning count. Kills the "server silently made `.kanmer/` in the wrong cwd" foot-gun; all skills lead with it.
- **`take_ticket`** — S. Params: `id`, `action: take|release` (default take), `branch`, `worktree?`, `stage?`, `assignee?`, `force?`. Wraps `store.takeTicket`/`releaseTicket`.
- **`get_ticket_doc` / `set_ticket_doc`** — M. Params: `id`, `doc: research|impact|plan|checklist|proof`; set adds `content` + `append?: boolean`. The doc-pipeline surface; `append` gives non-clobbering progress notes. `update_item body` stays for the ticket file itself.
- **`create_items`** — M. Bulk create: array of `create_item` fields, cap ~50, sequential (exclusive create makes that safe), per-entry results `{ ok, item | error }` with partial success. `kanmer-setup` brownfield seeds a backlog in one call.
- **`list_items` upgrades** — S. New params `updated_since` (ISO string compare), `sort: id|updated_desc`, `limit`. Summaries gain `archived`, `created`, `taken` (branch when taken), `docs` presence + checklist progress.
- **Board management** — M/L. Three granular verbs (safer than a whole-board setter):
  - `update_column` (kind, id, name?, color?, prefix? for areas) — id immutable.
  - `remove_column` (kind, id, `migrate_to?`) — requires the column empty, or rewrites every item matching it to `migrate_to` via `updateItem` (validation applies).
  - `reorder_columns` (kind, ordered id list) — must be a permutation of existing ids.
- Phase 1–2 behaviors (validation errors, conflict errors, proof gate) flow through the existing `guard()` unchanged.

## MCP 2026-07-28 modernization

Reference: the 2026-07-28 spec release (stateless core, Extensions framework, MRTR, cacheable lists — stdio impact is minimal; Roots/Sampling/Logging deprecated with ≥12-month support).

- **SDK upgrade** — M. `@modelcontextprotocol/sdk` ^1.12.0 → latest (2026-07-28 support). Old hosts keep working via version negotiation; verify with `smoke.mjs` against both protocol versions.
- **Actor attribution** — S. Read client identity from per-request `_meta` (2026-07-28) with `clientInfo` fallback (older hosts) → stamp `actor` in the Phase 6 activity log and default `take_ticket` assignee. Still no presence registry — files remain truth.
- **Cacheable list results** — S. Attach `ttlMs`/`cacheScope` to `tools/list` (the tool list is static).
- **MRTR elicitation** — M. Use `input_required` round-trips to confirm `delete_item` (folder + attachments!) and `remove_column … migrate_to` when the host supports it; plain errors otherwise.
- **Resources + `subscriptions/listen`** — M. Expose the board and tickets as MCP resources with opt-in change subscriptions — gives agents the change notifications only the GUI's chokidar has today.
- **Prompts** — S. Register `standup` and `take-ticket` as MCP prompts (host slash-command affordance).
- **MCP Apps** — exploratory only (server-rendered board summary in hosts like VS Code); not committed this roadmap.

> **Amended by the PR #2 review remediation:** A4 — the 2026-07-28 revision does not exist in `@modelcontextprotocol/sdk@^1.30.0`, which negotiates at most `2025-11-25`. `ttlMs`/`cacheScope` on `tools/list` are therefore unimplementable here, and no current host emits `io.modelcontextprotocol/client`. The `_meta` actor path is **not** dead code, though: the SDK forwards `params._meta` on every protocol and `smoke-protocol.mjs` proves the branch with a hand-written frame. The back-compat protocol run this section promised was never done at the time and is now `packages/mcp-server/src/smoke-protocol.mjs`.


## Companion fix (GUI main, same theme)

- **Connect scope** — S/M. `apps/gui/src/main/connect.ts` currently registers one user-scope `kanmer` entry with a hardcoded `--root`; a second project silently rewrites it. Switch to per-project registration (project `.mcp.json` for Claude Code; per-project server names for codex), keep the copy-paste fallback string.

## Verification
- `smoke.mjs` extended: every new tool present with correct annotations (`readOnlyHint` on `get_status`/`get_ticket_doc`; `destructiveHint` on `remove_column`); `get_status` reflects a fresh-created root; bulk create partial-failure shape; `updated_since` filters; `remove_column` with `migrate_to` rewrites items; proof-gate error surfaces through `move_item`.
- Run smoke against dev build AND the plugin bundle (`KANMER_SERVER`), and against an older-protocol host config for back-compat.
- `npm run plugin:check` passes with all new tool-reference rows.
