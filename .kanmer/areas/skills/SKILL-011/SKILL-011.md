---
id: SKILL-011
type: ticket
title: 'Scope kanmer-auto by group, not only by area'
status: backlog
area: skills
assignee: ''
profile: feature
labels: []
groups:
  - HZN-003
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-001-groups.md
archived: false
created: '2026-08-16T16:11:01.414Z'
updated: '2026-08-16T16:11:01.414Z'
---

## What

Teach `kanmer-auto` to take a **group** (EPIC/HZN) as its roster, alongside the
area/filter it accepts today.

## Why

The skill's frontmatter says "target an area (or filter)" and §1 builds the
roster from `list_items` for that area. Groups appear nowhere in the skill, and
`list_items` has no `group` filter — so "clear 0.3.4" (`HZN-003`) has no
supported path. The operator has to improvise the roster by hand from
`get_group` and feed it in as scope, which is exactly the kind of unwritten
step that goes wrong silently.

Groups are how releases are actually organised on this board — [[HZN-003]] is
the 0.3.4 roster — so a burn-down skill that cannot read one is missing its
most natural input.

## Approach

- Decide where group scoping is resolved: a `group` filter on `list_items`
  (MCP surface change, benefits every caller), or `get_group` inside the skill
  (skill-only, no server change). Research picks one and says why.
- Update `kanmer-auto` §1 to accept a group id, and its frontmatter/description
  so "clear HZN-003" / "work through 0.3.4" routes here.
- Respect group membership order and the same drop rules (archived, blocked,
  taken-by-someone-else); `blocks` edges still override lane ordering.
- Report the roster back naming the group, so the operator sees which tickets
  were resolved from it before anything starts.

## Verification

- [ ] `kanmer-auto` invoked with a group id produces the correct roster without
      the operator supplying ticket ids.
- [ ] Tickets in the group that are archived / blocked / taken are dropped and
      named in the skipped list.
- [ ] Area targeting still works unchanged.
- [ ] If `list_items` gained a `group` filter: covered by tests and reflected in
      `references/tool-reference.md` and the MCP surface FRD.

## Outcome
