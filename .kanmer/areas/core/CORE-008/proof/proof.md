# Proof

Branch at `3144b04`. Asserted over real stdio in `smoke.mjs`, because a group
an agent cannot reach through the tools is not a feature.

- `create_group` allocates `EPIC-001`; a second kind gets its own prefix
  (`HZN-001`); an undeclared kind is rejected.
- Two tickets given `groups: [EPIC-001]` via `update_item`; `get_group` derives
  both with their stages, and progress counts them in Backlog.
- **The invariant test:** the group file's bytes are captured, a member is moved
  to Implementing, and afterwards progress reads 1 implementing / 1 backlog
  while the group file is **byte-identical**. The file contains neither the
  member's id nor the word "members" — FRD-001 acceptance 5, checked rather
  than asserted in prose.
- Membership naming a nonexistent group is rejected.
- Context documents round-trip, including nested paths; writing the group's own
  `<ID>.md` through `set_group_doc` is refused.
- `list_groups` returns both and filters by kind.

Full rail: 116 core / 112 GUI, typecheck, smoke 117/117, smoke-protocol 26/26,
plugin:check 29 tools with matching bytes.
