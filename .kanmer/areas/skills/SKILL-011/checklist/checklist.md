# Checklist — SKILL-011

- [x] `ItemFilter` gains optional `group?: string` (`packages/core/src/types.ts`)
- [x] `matchesFilter` gains the group early-return, after the `area` case (`packages/core/src/store.ts`)
- [x] `list_items` MCP input schema gains `group`, with a description; unknown group returns empty rather than throwing
- [x] `kanmer-auto` frontmatter description routes group phrasing ("clear HZN-003", "work through 0.3.3") — **`plugins/kanmer/skills/`, not `.claude/skills/`**
- [x] `kanmer-auto` §1 resolves a roster from an area **or** a group; board order still governs ordering
- [x] Tool reference `list_items` row lists `group?` (`kanmer-tickets/references/tool-reference.md`)
- [x] Store tests: filter by group
- [x] Store tests: group AND status composed
- [x] Store tests: unknown group returns empty
- [x] Store tests: archived member respects `includeArchived`
- [x] Store tests: a ticket in several groups matches each
- [x] FRD-022 records the surface change
- [x] `npm run plugin:build`, and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` is **committed**
- [x] Verification run: `npm test`, `smoke:protocol`, `plugin:check`, `typecheck`, `typecheck -w @kanmer/gui` (this box produces proof.md)
- [x] Functional demonstration: `list_items` filtered by `HZN-003` returns its members **with `profile` and `taken` present** — the evidence for the design choice, not just the change

## Progress notes

**Rail, on `f7fbe95`.** `npm test` 201 passed (21 files), 5 new. `smoke:protocol`
26/26. `plugin:check` — 29 tools match, bundle bytes match. `verify:agents-block`
26/26. `npm run typecheck -w @kanmer/gui` clean. `npm run build` clean.

**Correction to the plan, and to [[GUI-067]].** The plan's verification listed
`npm run typecheck` at the root. **There is no root `typecheck` script** — the
root package defines build/test/smoke/plugin/release scripts and no typecheck at
all. GUI-067 is filed as "make the root typecheck cover every workspace", which
understates it: there is nothing to extend, only something to create. Worth
correcting on that ticket before it is worked. The GUI workspace script exists
and was run.

**The `blocks` drop rule is documented but not queryable.** §1 says to drop
tickets with `blocked: true`. `blocked` is a *derived* field on summaries (from
inbound `blocks` edges), not a filter — so the skill drops them after the call,
which is what it already does for `taken`. Not a defect and no change made; noted
because the plan's wording could be read as implying a filter.

**Demonstration output** (real board, `.worktrees/kanmer`):

```
list_items({ group: "HZN-003" }) -> 15 items
  DOC-007    feature   backlog
  GUI-065    fix       backlog
  GUI-067    chore     backlog
  …
  SKILL-011  feature   implementing   claude-code@skill-011-group-scoping

get_group("HZN-003") member fields: ["id","title","status","archived"]
  profile present? false
  taken   present? false

AND composition — group HZN-003 + area gui -> 10 items
unknown group HZN-999 -> 0 items (no throw)
control — no filter -> 121 items (unchanged path)
```

The three profiles present in one roster (`feature`/`fix`/`chore`) are exactly
what FRD-023 R2 partitioning needs and exactly what `get_group` cannot supply.
