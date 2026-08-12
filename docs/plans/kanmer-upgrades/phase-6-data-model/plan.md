# Phase 6 — Data-model extras

**Goal:** the four approved additive extensions — activity log, blocks/blocked-by, due dates, manual ordering. All optional, human-editable, back-compatible: new frontmatter keys go into `KEY_ORDER` (`packages/core/src/frontmatter.ts`) and `ItemFrontmatterSchema` (`types.ts`) as optional + omitted-when-unset, so existing files don't grow noise on rewrite.

**Depends on:** Phase 2 (v2 layout). **Feeds:** Phase 7 badges/feed/standup, Phase 8 standup rewrite.

## Items

### 6.1 Activity log — L
- **Where:** new `packages/core/src/activity.ts`, `io.ts` (append helper), `store.ts` (emit from create/update/move/take/delete), server `get_activity` tool.
- Single append-only JSONL at `.kanmer/data/activity.jsonl`: `{ts, id, op, field, from, to, actor}` — one line per mutation, `actor` from MCP client identity (Phase 3) or `"gui"`. Explicitly **derived convenience, not truth**: safe to delete, never consulted for state, plain text so it stays greppable. Append-only writes use plain `fs.appendFile` (no atomic-rename needed). Rotation: cap at ~5k lines; on exceed, truncate the oldest half.
- New read tool `get_activity` (`id?`, `since?`, `limit?`). This is what makes "TICK-004 moved to review yesterday" a fact rather than an inference — upgrading standups from staleness heuristics to a changelog.

### 6.2 Blocks / blocked-by — M/L
- **Where:** `types.ts`, `frontmatter.ts`, `links.ts` (`buildLinkIndex` gains typed edges), `store.ts`, server, GUI badge.
- Representation: sibling optional `blocks: [API-002]` array; **blocked-by is derived as backlinks, never stored** (consistent with the existing derived-backlinks position). "Blocked" = any blocker not archived and not in the last stage.
- `link_items` gains `rel: relates|blocks` (default `relates` — no breaking change); `get_links` returns typed edges; `list_items` summaries gain derived `blocked: true`. Card badge in Phase 7. Finally gives the standup's "blocked" flag real data.

### 6.3 Due dates — S/M
- **Where:** `types.ts`, `frontmatter.ts`, `store.ts` filters, server, standup skill.
- Optional date-only `due: 2026-08-20`. `list_items` gains `due_before` and `overdue: true` filters (compare against today, tickets not in the last stage). Overdue card badge in Phase 7; standup flags overdue items.

### 6.4 Manual ordering — M core, L with GUI
- **Where:** `types.ts`, `frontmatter.ts`, `store.ts` sort + move, server `move_item`, GUI `Board.tsx` drag.
- Optional fractional `order: number`; sort `(order ?? +Infinity, id)` so unordered files sort after ordered ones — no migration. `move_item` gains `position: top|bottom|{after: id}` computing a midpoint; rebalance lazily when gaps exhaust. GUI drag-and-drop writes `position` (insertion point from drop target). Makes "top of the todo column" meaningful for agents; plain YAML number stays hand-editable.

## Release rail
`get_activity` + `link_items rel` + `move_item position` + new filters → tool-reference rows/params, `kanmer-standup` + `kanmer-workflow` SKILL.md updates, bundle rebuild, `plugin:check`.

## Verification
- vitest: every mutation appends one well-formed activity line with correct `from`/`to`; rotation truncates; deleting the log breaks nothing.
- Blocked derivation flips when the blocker reaches the last stage or is archived; `rel` default keeps old `link_items` calls byte-identical.
- Overdue filter respects last-stage exemption. Ordering: midpoint insertion between neighbors, unordered-after-ordered, rebalance path.
- Old boards without any new keys round-trip unchanged (serialise → parse → byte-equal).
