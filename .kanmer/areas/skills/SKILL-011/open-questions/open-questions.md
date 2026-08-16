# Open questions — SKILL-011

*The open questions. Not scratch — these **block** the plan; scratch is a notepad and is never gated.*

- [ ] **File `update_group` as its own MCP ticket now?** — Research F5: there is
      no way for an agent to rename or archive a group, yet FRD-001 G4 defines
      archiving as the delete and `list_groups`' own description tells the reader
      to use it. Core has `updateGroup`; only the MCP surface lacks it. I hit
      this renaming HZN-003 this session and had to go around the tool layer.
      **Recommendation: yes, a separate MCP-area ticket** — it is surface, not
      orchestration, and folding it in would make this PR two unrelated changes.
      Only you can decide whether it belongs in 0.3.3.

- [ ] **Should the roster also be resolvable by *several* groups, or a
      group + area intersection?** — `matchesFilter` composes filters with AND
      for free, so `{ group: "HZN-003", area: "gui" }` works with no extra code.
      Multiple groups (OR) would need a different shape.
      **Recommendation: single group only.** AND composition comes free and
      covers the real case; multi-group OR has no demand yet and would be the
      only OR filter on the surface.

- [ ] **Do `kanmer-report` and `kanmer-groom` learn group scoping in this
      ticket?** — The filter is generic; the skills could use it.
      **Recommendation: no** — this ticket ships the filter and one consumer.
      Widening it widens the review for no benefit that cannot wait.

## Parked (explicitly deferred)

- **Refreshing the stale `.claude/skills/` install.** Research F0: it is
  gitignored, so it cannot be part of any PR, and it is a Connect re-run rather
  than a code change. Reopens if the staleness causes a second wrong-copy
  mistake — it has already caused one.
