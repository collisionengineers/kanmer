---
status: draft
covers: shipped server (backfill) + v3 tool delta (groups, profiles, removals)
---

# FRD-022 — MCP server surface

The agent-facing contract. Local stdio server; root resolved `--root` → `KANMER_ROOT` → cwd; **reads never create `.kanmer/`** — only an actual write does.

- R1. **Tool inventory (end-state), by category.** Read: get_status, list_board, list_items, get_item, get_ticket_doc, search_items, get_links, get_activity, get_doc_gates, **get_group, list_groups, get_group_doc**. Write: create_item, create_items (cap 50), update_item, move_item, take_ticket, set_ticket_doc, append_scratch, link_items, link_doc, migrate_board, **create_group, set_group_doc**, column tools (kind: **area only** — status and priority kinds removed per FRD-007/008). Destructive: delete_item, remove_column.
- R2. Annotations are honest: `readOnlyHint` on every read, `destructiveHint` only where true — this is what makes host approval modes work.
- R3. Descriptions are a contract layer (ADR-0009): they teach profiles, gates, the read-everything duty, and group context in-line; `get_doc_gates` is named as the orientation call before any move; parameter docs never contradict the core.
- R4. Actor attribution via `_meta` client identity feeds the activity log; MRTR elicitation guards destructive ops where the host supports it; resources/subscriptions and prompts remain; the take-ticket prompt text is core-SSOT shared with dispatch (FRD-010 R2).
- R5. `list_board`/`get_status` surface: the fixed stages, areas, group kinds, profiles, proof types, deployment envs, doc-type vocabulary — everything a skill needs without bespoke calls.
- R6. The release rail binds this surface to the skills: `tool-reference.md` rows must match tool names (`plugin:check`), the bundled `kanmer-mcp.cjs` must be byte-current (`plugin:build`), and `smoke.mjs` exercises every tool over real stdio.

**Acceptance:** smoke green across the full inventory incl. group tools, profile-gated moves, nested doc paths, proof warnings, and migrate_board dry-run; plugin:check passes at the final count.

Related: FRD-001/002/003/006/007/008 · ADR-0009 · AGENTS.md §7.
