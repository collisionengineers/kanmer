# Files — SKILL-011

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/types.ts:326-333` | Add `group?: string` to `ItemFilter`. Additive and optional; no existing caller changes. |
| `packages/core/src/store.ts:1491-1498` | One line in `matchesFilter`, in the same shape as the `label` case: `if (filter.group && !(item.groups ?? []).includes(filter.group)) return false;` |
| `packages/mcp-server/src/index.ts` | `list_items` input schema gains `group`; its description names it. Group ids are validated on write (FRD-001 G3) but a *filter* by an unknown group should return empty, not throw — the same way an unknown label does today. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md:3,14` | Frontmatter description gains the group phrasing ("clear HZN-003", "work through 0.3.3"); §1 resolves a group id via `list_items({ group })`. Everything from §2 down is untouched. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:12` | The `list_items` row spells its parameters out verbatim — required by FRD-023 R5. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | The surface changed; the FRD that covers it must say so. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `.gitignore:41` | **Read this first.** `.claude/skills/` is ignored — it is an *install artifact*, not source. Editing it changes nothing that ships and will be silently overwritten by the next Connect run. All skill edits go in `plugins/kanmer/skills/`. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | The real v3 skill: profile-aware per-ticket gates (§1), lanes by `files` overlap (§3), the five-bucket report (§5). Materially different from the `.claude/skills/` copy — do not work from memory of the latter. |
| `packages/core/src/store.ts:1037-1063` | What a `list_items` summary actually carries (`docs`, `checklist`, and via the caller `taken`/`profile`) — the fields F3 shows `get_group` lacks. |
| `docs/functional/frd/FRD-001-groups.md` | G3: membership lives on tickets and member lists are *always derived, never stored* — so filtering by group is a read over tickets, not a lookup on the group. G5 fixes the tool surface; G8/AC4 already sanction group-as-filter. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | R1 "derive, don't restate" (why roster logic belongs in a tool, not skill prose), R2 (profile-aware partitioning, which is why the roster needs `profile`), R5 (the release rail). |
| `scripts/release.mjs:149-160` | The mechanized rail: build, `plugin:check`, tests, both smokes, `verify:agents-block`, GUI typecheck — in that order. |

## Ripple effects

- **Tests.** `packages/core/src/store.test.ts` — filter by group; group + status
  composed; unknown group returns empty; archived members still respect
  `includeArchived`.
- **Committed build artifact.** `plugins/kanmer/mcp/kanmer-mcp.cjs` is a
  *committed bundle* (AGENTS.md §8 gotcha 8). A change to the MCP server means
  `plugin:build` must run and the regenerated bundle must be committed, or
  `plugin:check` fails the rail.
- **Smoke.** `npm run smoke:protocol` asserts the tool surface; a new parameter
  may need its count/shape updated.
- **GUI.** No change required — the GUI filters groups through its own path
  (FRD-011/019). Worth one check that nothing constructs an `ItemFilter`
  positionally.
- **The stale local install.** After merge, `.claude/skills/` must be refreshed
  via Connect or this repo's own agents keep reading the old skill. Not a code
  change, but it is the difference between shipping the fix and using it.

## Out of scope

- **`update_group`** (research F5). A genuine MCP-surface gap against FRD-001 G5
  — an agent cannot archive a group even though G4 defines archiving as the
  delete — but it is surface, not orchestration. Its own ticket, MCP area.
- **Group scoping in other skills** (`kanmer-report`, `kanmer-groom`). The filter
  is generic and they can adopt it later; widening now widens the review.
- **Group order as priority order.** Membership is derived in id order and is not
  the human's ordering; the skill keeps board order.
- **GUI group filtering.** Already specified and built elsewhere.
- **Refreshing `.claude/skills/`** as part of the PR — it is gitignored, so it
  cannot be in a diff.
