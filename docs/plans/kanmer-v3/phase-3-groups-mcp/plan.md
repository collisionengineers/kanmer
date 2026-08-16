# Phase 3 — Groups + MCP surface v3

**Goal:** the group entity in core and the complete v3 tool surface: +5 group tools, gates/profiles surfaced, status/priority column kinds removed, descriptions rewritten as the ADR-0009 contract layer.

**Depends on:** Phase 2 (frozen core). **Feeds:** 5 (GUI groups), 6 (skills freeze after this).

## Items

### 3.1 Group entity — M (FRD-001 G1–G4) · [[CORE-008]]
- **Where:** `types.ts` (board `groupKinds` with prefixes — defaults epic/EPIC, horizon/HZN; item `groups: []`), `paths.ts` (`groups/<ID>/`), `ids.ts` (per-kind prefixes via existing machinery), `store.ts` (group CRUD, archive, shared-doc IO reusing 2.3's path engine, derived members/progress), membership validation (ids must exist; archived groups still render on chips as archived).

### 3.2 Tool surface — L (FRD-022 R1–R5) · [[MCP-001]]
- **Where:** `packages/mcp-server/src/index.ts`.
- Add `create_group`/`get_group`/`list_groups`/`get_group_doc`/`set_group_doc`; `update_item` gains `groups`, `profile`, `requires`; drop priority params; column kind → area-only; `get_doc_gates` exposes the core resolver incl. warnings; `list_board`/`get_status` surface stages/kinds/profiles/proofTypes/doc vocabulary; every description rewritten to teach profiles + read-everything in-line; annotations audited (all group reads `readOnlyHint`).

### 3.3 Prompt/dispatch SSOT — S · [[CORE-009]]
- Task prompt texts (FRD-010 R2) into core, imported by the MCP prompt and Phase 5's dispatch picker.

## Release rail (hard obligations, AGENTS.md §7)
- `tool-reference.md`: +5 group rows; status/priority column prose removed; field semantics updated (groups/profile/requires in, priority out; six stages). `npm run plugin:build` (bundle refresh) + `npm run plugin:check` (must match the new count — the guard).

## Verification
- `smoke.mjs`: group create/read/doc round-trip incl. nested paths; membership via update_item; derived progress after a member move; profile-gated move matrix (feature blocked leaving Backlog; chore one-jump; spike to Done); proof soft-warning surfaced; migrate_board dry-run on the legacy-board fixture; elicitation confirm/decline retained.
- `plugin:check` green at the final tool count; `smoke-protocol.mjs` green.
