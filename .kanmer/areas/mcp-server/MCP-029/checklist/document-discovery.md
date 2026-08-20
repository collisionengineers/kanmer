# Checklist — MCP-029

- [ ] Add a canonical typed Markdown-path inventory in core, reusing recursive document discovery.
- [ ] Extend ticket document metadata with sorted per-type relative paths without changing existing counts.
- [ ] Surface the inventory from `get_item` and `get_doc_gates` with clear MCP descriptions.
- [ ] Add core regression tests for named-only/nested documents, ordering, and non-Markdown exclusions.
- [ ] Add MCP smoke/protocol coverage that discovers then reads a named research document and retains bare-index absence.
- [ ] Update the canonical tool reference and regenerate the plugin bundle if its contract text changes.
- [ ] Run affected typecheck, core tests, MCP smoke/protocol tests, build, plugin check, and diff check.
- [ ] Write the post-implementation report with exact commands/results and open the reviewable change.
- [ ] Verify merged-main behavior and write proof before Done.

## Progress notes

No implementation started.
