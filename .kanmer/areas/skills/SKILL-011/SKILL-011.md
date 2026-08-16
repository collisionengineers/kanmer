---
id: SKILL-011
type: ticket
title: 'Scope kanmer-auto by group, not only by area'
status: done
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T16:18:15.993Z'
  review: '2026-08-16T17:02:28.954Z'
  verifying: '2026-08-16T17:08:05.502Z'
  done: '2026-08-16T17:08:09.468Z'
labels: []
groups:
  - HZN-003
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-001-groups.md
commits:
  - ba16d2e
  - 9658d08
prs:
  - '#31'
  - '#32'
archived: false
created: '2026-08-16T16:11:01.414Z'
updated: '2026-08-16T17:38:27.544Z'
---

## What

Teach `kanmer-auto` to take a **group** (EPIC/HZN) as its roster, alongside the
area/filter it accepts today.

## Why

The skill's frontmatter says "target an area (or filter)" and §1 builds the
roster from `list_items` for that area. Groups appear nowhere in the skill, and
`list_items` has no `group` filter — so "clear 0.3.3" (`HZN-003`) has no
supported path. The operator has to improvise the roster by hand from
`get_group` and feed it in as scope, which is exactly the kind of unwritten
step that goes wrong silently.

Groups are how releases are actually organised on this board — [[HZN-003]] is
the 0.3.3 roster — so a burn-down skill that cannot read one is missing its
most natural input.

## Approach

- Decide where group scoping is resolved: a `group` filter on `list_items`
  (MCP surface change, benefits every caller), or `get_group` inside the skill
  (skill-only, no server change). Research picks one and says why.
- Update `kanmer-auto` §1 to accept a group id, and its frontmatter/description
  so "clear HZN-003" / "work through 0.3.3" routes here.
- Respect the same drop rules (archived, blocked, taken-by-someone-else);
  `blocks` edges still override lane ordering.
- Report the roster back naming the group, so the operator sees which tickets
  were resolved from it before anything starts.

## Verification

- [x] `kanmer-auto` invoked with a group id produces the correct roster without
      the operator supplying ticket ids.
- [x] Tickets in the group that are archived / blocked / taken are dropped and
      named in the skipped list.
- [x] Area targeting still works unchanged.
- [x] If `list_items` gained a `group` filter: covered by tests and reflected in
      `references/tool-reference.md` and the MCP surface FRD.

## Outcome

Shipped as the `group` filter on `list_items` plus `kanmer-auto` §1 consuming
it. PR [#31](https://github.com/collisionengineers/kanmer/pull/31) (`ba16d2e`),
merged 2026-08-16.

**It shipped broken and was fixed the same day.** PR #31's committed plugin
bundle did **not** contain the feature: it was built inside `.worktrees/skill-011`,
which has no `node_modules`, so `@kanmer/core` resolved up to the main
checkout's workspace symlink and tsup bundled main's core instead. Tests passed
(vitest runs from `src`) and `plugin:check` passed inside the worktree because
both sides were built the same wrong way. It failed the first time
`plugin:check` ran at the repo root — after merge. Corrected by PR
[#32](https://github.com/collisionengineers/kanmer/pull/32) (`9658d08`), which
also added the trap to AGENTS.md §8 gotcha 8.

**Follow-ups filed:** [[MCP-006]] (`update_group` — hit while renaming HZN-003,
with no tool path), [[MCP-007]] (make `plugin:check` refuse inside a worktree
rather than pass meaninglessly — prose in AGENTS.md is the weakest available fix
for something that silently ships the wrong artifact).

**Shipped differently than planned:** the plan's verification listed
`npm run typecheck` at the repo root. No such script exists — the root defines
build/test/smoke/plugin/release and no typecheck at all. Only the GUI workspace
was typechecked. [[GUI-067]] reads "make the root typecheck cover every
workspace", which understates it: there is nothing to extend, only something to
create. Worth correcting on that ticket before it is worked.

Not deployed — shipped to `main`, awaiting the 0.3.3 release.
