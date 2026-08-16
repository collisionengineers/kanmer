---
status: approved
covers: shipped server (backfill) + v3 tool delta (groups, profiles, removals)
---

# FRD-022 — MCP server surface

The agent-facing contract. Local stdio server; root resolved `--root` → `KANMER_ROOT` → cwd; **reads never create `.kanmer/`** — only an actual write does.

- R1. **Tool inventory (end-state), by category.** Read: get_status, list_board, list_items, get_item, get_ticket_doc, search_items, get_links, get_activity, get_doc_gates, **get_group, list_groups, get_group_doc**. Write: create_item, create_items (cap 50), update_item, move_item, take_ticket, set_ticket_doc, append_scratch, link_items, link_doc, migrate_board, **create_group, set_group_doc**, column tools (kind: **area only** — status and priority kinds removed per FRD-007/008). Destructive: delete_item, remove_column.
- R2. Annotations are honest: `readOnlyHint` on every read, `destructiveHint` only where true — this is what makes host approval modes work.
- R3. Descriptions are a contract layer (ADR-0009): they teach profiles, gates, the read-everything duty, and group context in-line; `get_doc_gates` is named as the orientation call before any move; parameter docs never contradict the core.
- R4. Actor attribution via `_meta` client identity feeds the activity log; MRTR elicitation guards destructive ops where the host supports it; resources/subscriptions and prompts remain; the take-ticket prompt text is core-SSOT shared with dispatch (FRD-010 R2).
- R5. `list_board`/`get_status` surface: the fixed stages, areas, group kinds, profiles, proof types, deployment envs, doc-type vocabulary — everything a skill needs without bespoke calls.
- R5a. **`list_items` filters by `group`.** Filters are AND-composed, and an unknown group id returns nothing rather than erroring — a filter asks a question, it does not assert one (ids are validated on write instead, FRD-001 G3). This is the supported way to build a working roster from an epic or horizon: summaries carry `profile`, `taken` and `docs`, which the derived member list from `get_group` does not, and which kanmer-auto needs for its drop rules and profile partitioning (FRD-023 R2). It is also the MCP-side counterpart of the group filter FRD-001 G8/AC4 already requires of every GUI view.
- R6. The release rail binds this surface to the skills: `tool-reference.md` rows must match tool names (`plugin:check`), the bundled `kanmer-mcp.cjs` must be byte-current (`plugin:build`), and `smoke.mjs` exercises every tool over real stdio.

**Acceptance:** smoke green across the full inventory incl. group tools, profile-gated moves, nested doc paths, proof warnings, and migrate_board dry-run; plugin:check passes at the final count.

Related: FRD-001/002/003/006/007/008 · ADR-0009 · AGENTS.md §7.

## Verified against code — Phase 0.2

`packages/mcp-server/src/index.ts` is the only file in the repo calling `registerTool`.

- Root resolution is exactly `--root` → `KANMER_ROOT` → `cwd` `root.ts:12-19`, applied once
  `index.ts:26-27` and echoed to stderr `index.ts:969`. Reads never create `.kanmer/`: `init` is
  lazy and only the `write()` wrapper calls `ensureInit()` `index.ts:51-66`.
- R1 — **24 tools registered today**, against 29 at the v3 end state (+5 group tools). Present:
  the 12 reads listed minus `get_group`/`list_groups`/`get_group_doc`, and the writes minus
  `create_group`/`set_group_doc`. Column tools still accept `kind: status|area|priority`
  `index.ts:694` — narrowing to area-only is the Phase 3 delta. `create_items` caps at 50
  `index.ts:477`.
- R2 — every read carries `readOnlyHint: true`; `destructiveHint: true` appears on exactly two,
  `remove_column` `index.ts:744` and `delete_item` `index.ts:800`.
- R3 — descriptions are hand-authored prose in each `registerTool` call, with per-field
  `.describe()`. **There is no generator**, and `plugin:check` compares tool *names* only
  (`scripts/check-plugin-sync.mjs:39-45`, which deliberately stops reading at `## Field
  semantics`) — so description drift is currently unguarded. Worth fixing in Phase 3.
- R4 — actor from `_meta` client identity `index.ts:62,80-88`; elicitation guard
  `confirmDestructive` `index.ts:96-114`; resources `kanmer://board` `index.ts:829` and
  `kanmer://items/{id}` `index.ts:848-873` with subscriptions `index.ts:895-904`; prompts `standup`
  `index.ts:910` and `take-ticket` `index.ts:935`, the latter sharing `takeTicketPromptText` with
  the GUI's dispatch (`apps/gui/src/main/dispatch.ts:98`) — the SSOT R4 claims, confirmed.
- R6 — the rail is real: `plugin:check` passes at 24 tools with matching bundle bytes, and
  `smoke.mjs` covers the surface at 85 checks, `smoke-protocol.mjs` at 26.

Note `packages/mcp-server` has **no unit tests** — the two `.mjs` smoke scripts are its entire
automated coverage, which is why Phase 3 extends them rather than adding vitest.
