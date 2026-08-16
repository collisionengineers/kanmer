# Research — SKILL-011: scoping kanmer-auto by group

## Question

Can `kanmer-auto` take a group (EPIC/HZN) as its roster, and where should that
resolution happen — a `group` filter on `list_items`, or `get_group` inside the
skill?

## Findings

### F0. The skill I read to file this ticket was the wrong copy

There are **two** skill trees, and they have diverged:

- `plugins/kanmer/skills/` — 12 skills, tracked in git (`73e2e9c`), **v3-aware**:
  profiles, the `files` document, per-ticket gates, one-gated-boundary-per-move.
  This is the source of truth and what Connect installs.
- `.claude/skills/` — 13 skills plus `run-kanmer`, **untracked and gitignored**
  (`.gitignore:41`), so it is an *install artifact*, not source. It is stale:
  v2-era (`impact.md`, "leave Planning", research→plan→execute hardcoded) and
  still carries `kanmer-import`, which FRD-013 removed.

The ticket body was written from the stale copy. Both of its conclusions survive
— neither tree has group scoping, and both are parallel-first — but the v3 text
differs materially and is the one to edit.

This also explains a finding from the board-wide open-questions sweep: GUI-064
parked a note that `.claude/skills/kanmer-research/assets/` ships
`impact-template.md` while the plugin ships `files-template.md`. That is not
source drift needing a ticket — it is one stale install. Re-running Connect
fixes it.

### F1. Neither copy scopes by group

`plugins/kanmer/skills/kanmer-auto/SKILL.md:3` — "target an area (or filter)";
`:14` builds the roster from `list_items` for the target area. The words "group",
"epic" and "horizon" appear nowhere in the file. Confirmed by reading it whole.

### F2. `list_items` has no `group` filter, and adding one is three lines

`ItemFilter` (`packages/core/src/types.ts:326-333`) carries `type`, `status`,
`area`, `label`, `includeArchived`. `matchesFilter`
(`packages/core/src/store.ts:1491-1498`) is a flat run of early returns:

```ts
if (filter.label && !(item.labels ?? []).includes(filter.label)) return false;
```

`groups: string[]` already lives on the item (FRD-001 G3, validated on write),
so the group case is the same line with a different array. The change is one
field on the interface, one line in the matcher, and the MCP tool's input schema
plus its description.

### F3. `get_group` alone cannot drive kanmer-auto

`get_group` derives membership, but each member carries only
`{ id, title, status, archived }` — verified by calling it on HZN-003. The skill
needs three things that are not there:

| Needed by | Field | In `get_group`? |
|---|---|---|
| §1 drop rule "taken by someone else" | `taken` | no |
| §1 drop rule "`blocked: true`" | `blocked` | no |
| FRD-023 R2 profile-aware partitioning | `profile` | no |

A `list_items` summary carries all three. Group-only scoping therefore costs N
extra `get_item` calls before the roster can even be filtered — and a roster of
fourteen (HZN-003) means fourteen round-trips to reconstruct what one filtered
call returns.

### F4. Group-as-filter is already the specified behaviour

FRD-001 G8 puts a group dropdown in the FilterBar, and acceptance criterion 4
reads: *"A `horizon` filter (`NOW`) narrows every view (board + backlog) to its
members."* The GUI is specified to filter by group; the MCP surface simply never
got the same affordance. Adding it closes a gap rather than inventing a concept.

### F5. Bonus gap found while renaming HZN-003: there is no `update_group`

FRD-001 G5 lists the group tool surface — `create_group`, `get_group`,
`list_groups`, `get_group_doc`, `set_group_doc` — and genuinely omits any update.
`packages/mcp-server/src/index.ts` matches (tools at :400, :416, :431, :448).

But G4 states *"Deleting = archiving"*, which an agent consequently **cannot
do**, and `list_groups`' own description tells the reader "archiving is how a
group is retired". `KanmerStore.updateGroup` exists (`store.ts:1285-1297`) and
the GUI wires it through `CH.updateGroup` (`apps/gui/src/main/index.ts:762`), so
only the MCP surface is missing it. `set_group_doc`'s description compounds this
by advising "edit that through create_group's body" — `create_group` allocates a
new id and cannot edit anything.

Encountered directly: renaming HZN-003 from "0.3.4" to "0.3.3" this session had
no tool path and had to go through core.

### F6. The rail this change must clear

FRD-023 R5: any tool-surface change updates the tool reference, and
`plugin:build` + `plugin:check` + `verify-agents-block` gate every skills change.
The `list_items` row is
`plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:12`, which
spells out the parameter list verbatim.

## Implications

**Do both, in one ticket: add the filter, then use it.** F2 makes the core change
nearly free and F3 makes it necessary — `get_group`-only scoping is more skill
code, more round-trips, and still cannot apply the skill's own documented drop
rules without them. F4 says the concept is already sanctioned.

The skill change is then small and honest: §1 accepts a group id, resolves the
roster with `list_items({ group })`, and everything downstream — drop rules,
profile partitioning, lanes, `blocks` edges, the target point, the five-bucket
report — is untouched.

Two things this research rules out:

- **Skill-side resolution only.** Cheaper to ship, but it pushes membership
  logic into prose, which FRD-023 R1 ("derive, don't restate") is explicitly
  trying to remove from skills.
- **Group ordering as lane ordering.** Membership is derived and returned in id
  order; it is not the human's priority order the way board order is. The skill
  should keep using `sort`/board order and treat the group purely as a
  membership filter.

F5 is real but is not this ticket: it is an MCP-surface gap against FRD-001 G5,
not orchestration. It wants its own ticket in the MCP area.

## Open questions

Carried in `open-questions` — chiefly whether `update_group` (F5) becomes its own
ticket now, and which other skills should learn group scoping.
