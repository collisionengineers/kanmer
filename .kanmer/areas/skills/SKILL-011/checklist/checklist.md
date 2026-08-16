# Checklist — SKILL-011

- [ ] `ItemFilter` gains optional `group?: string` (`packages/core/src/types.ts`)
- [ ] `matchesFilter` gains the group early-return, after the `area` case (`packages/core/src/store.ts`)
- [ ] `list_items` MCP input schema gains `group`, with a description; unknown group returns empty rather than throwing
- [ ] `kanmer-auto` frontmatter description routes group phrasing ("clear HZN-003", "work through 0.3.3") — **`plugins/kanmer/skills/`, not `.claude/skills/`**
- [ ] `kanmer-auto` §1 resolves a roster from an area **or** a group; board order still governs ordering
- [ ] Tool reference `list_items` row lists `group?` (`kanmer-tickets/references/tool-reference.md`)
- [ ] Store tests: filter by group
- [ ] Store tests: group AND status composed
- [ ] Store tests: unknown group returns empty
- [ ] Store tests: archived member respects `includeArchived`
- [ ] Store tests: a ticket in several groups matches each
- [ ] FRD-022 records the surface change
- [ ] `npm run plugin:build`, and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` is **committed**
- [ ] Verification run: `npm test`, `smoke:protocol`, `plugin:check`, `typecheck`, `typecheck -w @kanmer/gui` (this box produces proof.md)
- [ ] Functional demonstration: `list_items` filtered by `HZN-003` returns its members **with `profile` and `taken` present** — the evidence for the design choice, not just the change

## Progress notes
