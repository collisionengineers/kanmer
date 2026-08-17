# Checklist — MCP-006

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [x] Core: `KanmerStore.updateGroup` accepts `expectedUpdated`, destructured off the patch before the spread, conflict-checked **before** the no-op comparison, with `pruneUndefined` on the remaining fields
- [x] Core: `conflictError` widened from `current: Item` to a structural `{ updated: string; body?: string }`, message string byte-identical
- [x] Core tests in `store.test.ts`: rename round-trip, archive/unarchive, no-op does not bump `updated`, stale `expectedUpdated` rejects with `/Conflict/` (including on a no-op patch), fresh one accepted, explicit `title: undefined` does not erase `title:`, `expectedUpdated` never reaches the group's frontmatter, unknown id throws
- [x] MCP: `update_group` registered in the Groups block after `create_group` — params `id`, `title?`, `body?`, `archived?`, `expected_updated?`; annotations `readOnlyHint:false, destructiveHint:false, idempotentHint:true`; rest-spread handler
- [x] MCP: `update_group`'s description states what is patchable, that `body` replaces, that a no-op does not bump `updated`, that `kind` cannot change and why, and that membership rides `update_item(groups:[...])`
- [x] MCP: `list_groups` description points at `update_group(archived: true)` as the way a group is retired
- [x] MCP: `set_group_doc` description points at `update_group` instead of the impossible "create_group's body"
- [x] `tool-reference.md`: `update_group` row added to the Write table, first cell exactly `` `update_group` ``
- [x] `smoke.mjs`: count `29 → 30`, `"update_group"` in the existence list, and group-scenario checks (rename visible in `get_group`, members/progress intact, no-op leaves `updated`, stale `expected_updated` errors, archive drops it from `list_groups` unless `include_archived`, members untouched, unarchive restores)
- [x] `smoke-protocol.mjs`: count `29 → 30`
- [x] FRD-001 G5 lists `update_group(id, {title?, body?, archived?, expected_updated?})`, tied to G4's archive-is-retirement
- [x] FRD-022: R1 Write inventory gains `update_group`; the Phase-0.2 R1 bullet recounted from the code (30 registered, +6 group tools) with its now-false "group tools absent" and "column kinds status|area|priority" claims corrected
- [x] AGENTS.md §5: tool count `24 → 30`, Read list gains `get_group`/`list_groups`/`get_group_doc`, Write list gains `create_group`/`update_group`/`set_group_doc` — and `git diff AGENTS.md` shows nothing else
- [x] `npm run plugin:build` run and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` committed
- [x] Verification run: `npm test`, `npm run typecheck`, `npm run smoke:protocol`, `node packages/mcp-server/src/smoke.mjs` against the built bundle, and `npm run plugin:check` from the main checkout (this box produces proof.md)

## Progress notes

**Branched off `d1ef063`, not `3e9ee2c`.** GUI-073 (#55) landed while the plan
was being written, so the worktree was cut from the newest `origin/main`. No
conflict with it — it touches provider docs only.

**Recount, from the code, not from research.** `grep -c 'registerTool('
packages/mcp-server/src/index.ts` → **29** before, **30** after. Both smoke
scripts and AGENTS.md §5 were reconciled against that number, not against
research's figures. The name-sync check that `plugin:check` performs was also run
by hand in the worktree (30 registered / 30 documented / no drift in either
direction), because `plugin:check` itself refuses to run here.

**Two FRD-022 claims were already false beyond the count.** The Phase-0.2 R1
bullet also said the group tools were absent and that the column tools still
accepted `kind: status|area|priority`. `columnKindEnum` is `z.literal("area")`
(`index.ts:215`), so the Phase 3 delta it describes as pending is done. The whole
bullet was rewritten rather than having its number patched.

**Two test expectations were wrong first time, not the code.** `readGroup`
returns the body with its trailing newline (`serialiseGroup` adds it), so
`expect(body).toBe("Body.")` failed on `"Body.\n"`. Fixed to compare trimmed.
Both failures were in the new tests; nothing pre-existing broke.

**`kind` cannot be *rejected*, only ignored.** The plan expected
`update_group(kind: ...)` to error. It does not: the MCP SDK parses arguments
with a non-strict `z.object`, which strips unknown keys silently. The smoke check
was rewritten to assert the honest thing — that `kind` is still `epic` after the
attempt — rather than an error that never comes.

**`plugin:check` refused in the worktree, as designed (MCP-007).** It is path-based:
`npm install` in the worktree does not satisfy it, and there is deliberately no
bypass. Deferred to verify, on merged main, from the main checkout. The committed
bundle was checked for embedded absolute paths first (none — the three
`.worktrees` hits are source string literals), so a rebuild elsewhere should be
byte-identical.

**Rail (worktree, pre-merge):** `npm test` 10/10 + 23/23 + 41/41 files green,
241 core tests; `npm run typecheck` clean across all four workspaces;
`npm run smoke:protocol` 26/26 (30 tools on all three protocol versions);
`node packages/mcp-server/src/smoke.mjs` against the built plugin bundle
**156/156**, including all 13 new `update_group` checks.
