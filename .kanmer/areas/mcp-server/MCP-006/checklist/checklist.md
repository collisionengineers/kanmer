# Checklist — MCP-006

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [ ] Core: `KanmerStore.updateGroup` accepts `expectedUpdated`, destructured off the patch before the spread, conflict-checked **before** the no-op comparison, with `pruneUndefined` on the remaining fields
- [ ] Core: `conflictError` widened from `current: Item` to a structural `{ updated: string; body?: string }`, message string byte-identical
- [ ] Core tests in `store.test.ts`: rename round-trip, archive/unarchive, no-op does not bump `updated`, stale `expectedUpdated` rejects with `/Conflict/` (including on a no-op patch), fresh one accepted, explicit `title: undefined` does not erase `title:`, `expectedUpdated` never reaches the group's frontmatter, unknown id throws
- [ ] MCP: `update_group` registered in the Groups block after `create_group` — params `id`, `title?`, `body?`, `archived?`, `expected_updated?`; annotations `readOnlyHint:false, destructiveHint:false, idempotentHint:true`; rest-spread handler
- [ ] MCP: `update_group`'s description states what is patchable, that `body` replaces, that a no-op does not bump `updated`, that `kind` cannot change and why, and that membership rides `update_item(groups:[...])`
- [ ] MCP: `list_groups` description points at `update_group(archived: true)` as the way a group is retired
- [ ] MCP: `set_group_doc` description points at `update_group` instead of the impossible "create_group's body"
- [ ] `tool-reference.md`: `update_group` row added to the Write table, first cell exactly `` `update_group` ``
- [ ] `smoke.mjs`: count `29 → 30`, `"update_group"` in the existence list, and group-scenario checks (rename visible in `get_group`, members/progress intact, no-op leaves `updated`, stale `expected_updated` errors, archive drops it from `list_groups` unless `include_archived`, members untouched, unarchive restores)
- [ ] `smoke-protocol.mjs`: count `29 → 30`
- [ ] FRD-001 G5 lists `update_group(id, {title?, body?, archived?, expected_updated?})`, tied to G4's archive-is-retirement
- [ ] FRD-022: R1 Write inventory gains `update_group`; the Phase-0.2 R1 bullet recounted from the code (30 registered, +6 group tools) with its now-false "group tools absent" and "column kinds status|area|priority" claims corrected
- [ ] AGENTS.md §5: tool count `24 → 30`, Read list gains `get_group`/`list_groups`/`get_group_doc`, Write list gains `create_group`/`update_group`/`set_group_doc` — and `git diff AGENTS.md` shows nothing else
- [ ] `npm run plugin:build` run and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` committed
- [ ] Verification run: `npm test`, `npm run typecheck`, `npm run smoke:protocol`, `node packages/mcp-server/src/smoke.mjs` against the built bundle, and `npm run plugin:check` from the main checkout (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
