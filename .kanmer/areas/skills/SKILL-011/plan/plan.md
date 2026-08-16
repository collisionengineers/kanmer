# Plan — SKILL-011: scope kanmer-auto by group

## Approach

**Add `group` to `list_items`, then have `kanmer-auto` use it.** Research F2
showed the core change is three lines — one optional field on `ItemFilter`, one
early-return in `matchesFilter`, one entry in the MCP input schema — and F3
showed the alternative cannot work: `get_group`'s derived members carry only
`{ id, title, status, archived }`, so a skill scoping through it would still need
one `get_item` per ticket to apply the drop rules the skill already documents
(`taken`, `blocked`) and the profile partitioning FRD-023 R2 requires. Fourteen
round-trips to reconstruct what one filtered call returns is not a cheaper
design, it is the same design with the work moved into prose. F4 settles that the
concept is already sanctioned: FRD-001 G8 puts a group filter in the FilterBar
and acceptance criterion 4 requires a horizon filter to narrow every view.

The skill change is deliberately narrow. §1 gains a way to resolve a roster;
everything downstream — drop rules, profile partitioning, file-overlap lanes,
`blocks` edges, the target point, the five-bucket report — is untouched, because
none of it cares where the roster came from.

## Governing docs

**`docs/functional/frd/FRD-001-groups.md` — meets.**
- **G3** (membership lives on tickets; member lists always derived, never
  stored): the filter is a predicate over `item.groups`, so it derives
  membership on every read exactly like `get_group` does. Nothing is cached and
  no group file is written. Step 2 is the whole of the compliance.
- **G8 / acceptance criterion 4** (a horizon filter narrows every view): the GUI
  half is already built; this extends the same affordance to the MCP surface,
  which AC4's "every view" arguably always implied.
- **G5** (the tool list) is **not** amended here — it enumerates the *group*
  tools, and this adds a parameter to an item tool. [[MCP-006]] amends G5.

**`docs/functional/frd/FRD-023-agent-skills-system.md` — meets.**
- **R1** (derive, don't restate): the reason roster resolution goes into the
  tool rather than skill prose. Step 4 adds no rule to `kanmer-auto`; it points
  at a parameter.
- **R2** (auto partitions by profile): satisfied by *not* regressing — the
  filter returns full summaries carrying `profile`, which `get_group` does not.
  This is the requirement that rules the alternative out.
- **R5** (any tool-surface change updates the tool reference; `plugin:build` +
  `plugin:check` + `verify-agents-block` gate every skills change): steps 3, 5
  and 7.

**No new ADR.** Nothing here is a design decision: an optional filter parameter
on an existing tool, consistent with `label`, is the shape the surface already
has.

## Steps

1. **`ItemFilter` gains `group?: string`** (`packages/core/src/types.ts:326-333`).
   Optional, so every existing caller is unaffected.
2. **`matchesFilter` gains one line** (`packages/core/src/store.ts:1491-1498`),
   in the same shape as the `label` case:
   `if (filter.group && !(item.groups ?? []).includes(filter.group)) return false;`
   Placed after `area` so the read order matches the interface.
3. **`list_items` MCP schema gains `group`** with a description saying it filters
   by group membership. An unknown group id returns an empty list rather than
   throwing — matching `label`, and correct because a *filter* is a question, not
   an assertion. (Group ids are still validated on **write**, per FRD-001 G3.)
4. **`kanmer-auto` §1 accepts a group.** Frontmatter description gains the
   phrasing that routes "clear HZN-003" / "work through 0.3.3" here; §1 says the
   roster comes from `list_items` for an area **or** a group. Board order still
   governs ordering — group membership is derived in id order and is not the
   human's priority order, so it is a membership filter and nothing more.
5. **Tool reference** — the `list_items` row
   (`plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:12`)
   spells its parameters out verbatim and must list `group?`.
6. **Tests** (`packages/core/src/store.test.ts`): filter by group; group AND
   status composed; unknown group returns empty; an archived member still
   respects `includeArchived`; a ticket in several groups matches each.
7. **Rebuild the committed bundle.** `plugins/kanmer/mcp/kanmer-mcp.cjs` is a
   committed build artifact (AGENTS.md §8 gotcha 8) — `plugin:build`, then
   commit the regenerated bundle, or `plugin:check` fails the rail.
8. **FRD-022** records the surface change.

## Verification

Proof is a command log plus the rail.

- `npm test` — the new store tests among them, and nothing else moving.
- `npm run smoke:protocol` — asserts the tool surface end to end.
- `npm run plugin:check` — tool count and bundle bytes match after step 7.
- `npm run typecheck` **and** `npm run typecheck -w @kanmer/gui`. Both, because
  the root typecheck does not reach the GUI workspace — the gap that let a
  broken build through on PR #29, and the subject of GUI-067.
- **The functional demonstration:** `list_items` filtered by `HZN-003` returns
  exactly the group's fifteen members with `profile` and `taken` present on each
  — the fields research F3 showed `get_group` cannot supply. That single output
  is the evidence for both the change and the design choice behind it.

## Risks / open questions

- **Risk: the wrong skill tree gets edited.** `.claude/skills/` is gitignored
  and stale (research F0) and is what an agent in this repo reads by default.
  Editing it changes nothing that ships. Mitigation: step 4 names
  `plugins/kanmer/skills/` explicitly, and the diff will show it — a diff
  touching `.claude/` is impossible, since it cannot be staged.
- **Risk: forgetting the bundle.** Step 7 exists because `plugin:check` is the
  only thing that catches it, and it catches it late. Mitigation: it is its own
  checklist box, before verification.
- **No open questions.** All three are resolved: `update_group` is filed as
  [[MCP-006]] on the operator's instruction; single-group-only and
  not-widening-to-other-skills were taken as defaults per FRD-009 R4.
