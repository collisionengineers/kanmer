# Checklist — MCP-029

- [x] Add a canonical typed Markdown-path inventory in core, reusing recursive document discovery.
- [x] Extend ticket document metadata with sorted per-type relative paths without changing existing counts.
- [x] Surface the inventory from `get_item` and `get_doc_gates` with clear MCP descriptions.
- [x] Add core regression tests for named-only/nested documents, ordering, and non-Markdown exclusions.
- [x] Add MCP smoke/protocol coverage that discovers then reads a named research document and retains bare-index absence.
- [x] Update the canonical tool reference and regenerate the plugin bundle if its contract text changes.
- [ ] Run affected typecheck, core tests, MCP smoke/protocol tests, build, plugin check, and diff check.
- [x] Write the post-implementation report with exact commands/results and open the reviewable change.
- [ ] Verify merged-main behavior and write proof before Done.

## Progress notes

- Implemented document-path discovery in core and surfaced it in `list_items`, `get_item`, and `get_doc_gates`.
- Passed: `npm test -w @kanmer/core` (249 tests), `npm run typecheck -w @kanmer/core`, `npm run typecheck -w @kanmer/mcp-server`, `node packages/mcp-server/src/smoke.mjs` (158 checks), `npm run smoke:protocol` (26 checks), `npm run plugin:build`, and `git diff --check`.
- Opened PR #65: https://github.com/collisionengineers/kanmer/pull/65.
- `npm run plugin:check` deliberately refuses in this linked worktree. It must be run from the main checkout after the branch is reviewed/merged, per the repository guard.
