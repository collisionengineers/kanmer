# Phase 2 — MCP tool surface

**Goal:** expose the Phase 1 doc/gate/scratch/traceability/migration model to agents. Net **+4 tools (20 → 24)**, ~6 changed signatures, 0 removed; keep the surface lean (≈1:1 with `KanmerStore`) and every tool annotated (`readOnlyHint`/`destructiveHint`). All schema changes ride on Phase 1 core methods — no new store logic here.

**Depends on:** Phase 1 (frozen core API). **Feeds:** Phase 8 (skills call these). **Scope:** `packages/mcp-server`.

## Items

### 2.1 New tools (+4) — M
- **`append_scratch`** (write) — `{ id, slug?, content }` → `store.appendScratch`. Free-form working notes; deliberately separate from `set_ticket_doc` so gate/doc-type logic never applies to scratch (request #3). Read-back needs no new tool: `get_ticket_doc` accepts `scratch-<slug>` ids via the core whitelist (§1.5).
- **`link_doc`** (write) — `{ id, path, action: add|remove }` → maintains `refs[]` via the Phase 1 repo-path validator. Distinct from `link_items` (item↔item, requires target item exists) because this is item↔repo-file with path validation (request #13/#16).
- **`get_doc_gates`** (read, `readOnlyHint`) — `{ id? }`. With `id`: that ticket's resolved doc set, which docs exist, and which transitions are currently gated. Without `id`: the board's per-area doc-type + gate configuration summary. Lets a skill self-check before `move_item` instead of failing into the gate.
- **`migrate_board`** (write) — `{ dry_run? }` → core `migrateBoard` (§1.6: v1→v2 if needed, then the 7-stage/docs backfill, always previewable). Agent-driven upgrades (`kanmer-setup`'s upgrade path) need an MCP route; the GUI's existing `CH.migrate` (`main/index.ts:453`) repoints to the same core function.

### 2.2 Changed signatures — M
- **`set_ticket_doc` / `get_ticket_doc`** — `doc` param `z.enum([...])` (`index.ts:143`) → `z.string()`; validation + the "valid ids" error move to core (§1.3). Description points at the board's per-area doc types.
- **`move_item`** — enforces per-area hard gates; on failure returns a clean `isError` naming the missing doc(s)/repo-doc and the boundary (§1.2).
- **`create_item` / `create_items`** — accept `refs` + `docs_todo` (establish the governing PRD/FRD/ADR link at creation, request #13) and `commits`/`prs`/`deployment` where relevant (request #16).
- **`update_item`** — add `refs`, `commits`, `prs`, `deployment`; **remove `due`**. `summarise()` (`index.ts:121`) drops `due`, adds `refs`/`deployment`.
- **`list_items`** — remove `due_before`/`overdue` params (`index.ts:239-246`); `get_status`/`list_board` surface the per-area doc types + gate config + whether deployment tracking is on, so skills learn the doc model without a bespoke call.

### 2.3 Prompt SSOT — S
- Extract the `take-ticket` prompt text (`index.ts:797-821`) into a shared `takeTicketPromptText(id)` in `@kanmer/core`, imported by both the MCP prompt and Phase 7's `dispatch.ts`, so the two never drift.

## Release rail

The hard obligation (AGENTS.md §7): update `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` — add rows for `append_scratch`, `link_doc`, `get_doc_gates`, `migrate_board`; rewrite the `get_ticket_doc`/`set_ticket_doc` rows from the fixed enum to "dynamic, per-area"; update the field-semantics list to the 7 stages and add `refs`/`commits`/`prs`/`deployment`; drop `due`. Then `npm run plugin:build` (refresh the committed `kanmer-mcp.cjs`) and `npm run plugin:check` (fails on tool-name drift — the 4 new tools **must** have rows, else it errors; the enum-prose change alone won't trip it since the script diffs names only).

## Verification

- **`smoke.mjs`:** update summary `expectedKeys` (remove `due`, add `refs`); first-stage `status:"todo"` → `backlog`. Replace the Phase-6 `due`/`overdue` block with: a move into `review` blocked without `post-implementation-report` then succeeding after `set_ticket_doc`; a move into `done` blocked without `proof`; a `refs` create+get (and a backlog-exit blocked without refs unless `docs_todo`); a `link_doc` add/remove; an `append_scratch` append read back via `get_ticket_doc scratch-<slug>`; a `set_ticket_doc` with a dynamic (non-enum) doc name accepted, and an invalid name returning a clean `isError` listing valid ids. Keep blocks/order/activity.
- **Coverage debt (audit B4/B5):** smoke now advertises the `elicitation` capability and exercises `confirmDestructive` **confirm and decline** paths; add a resources/`subscriptions/listen` notification assertion. (The older-protocol back-compat check remains open — tracked in Phase 0's loose ends.)
- `npm run plugin:check` passes with 24 tools matched.
- Annotations present on every new tool; `get_doc_gates` is `readOnlyHint`, `append_scratch`/`link_doc`/`migrate_board` are writes, no new `destructiveHint`.
