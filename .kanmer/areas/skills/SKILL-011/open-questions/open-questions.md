# Open questions — SKILL-011

*The open questions. Not scratch — these **block** the plan; scratch is a notepad and is never gated.*

- [x] **File `update_group` as its own MCP ticket now?** — Research F5: there is
      no way for an agent to rename or archive a group, yet FRD-001 G4 defines
      archiving as the delete and `list_groups`' own description tells the reader
      to use it. Core has `updateGroup`; only the MCP surface lacks it.
      → **Answered by the operator, 2026-08-16: yes.** Filed as [[MCP-006]] and
      added to HZN-003, so it ships in 0.3.3 alongside this. Out of scope here.

- [x] **Should the roster also be resolvable by *several* groups, or a
      group + area intersection?**
      → **Taken as a default, not asked** (FRD-009 R4: trivial defaults are
      taken, not escalated). **Single group only.** `matchesFilter` composes
      filters with AND for free, so `{ group: "HZN-003", area: "gui" }` works
      with no extra code; multi-group OR has no demand and would be the only OR
      filter on the surface. Reopen if a real case appears.

- [x] **Do `kanmer-report` and `kanmer-groom` learn group scoping in this
      ticket?**
      → **Taken as a default, not asked.** **No** — this ticket ships the filter
      and one consumer. The filter is generic, so they can adopt it whenever
      they need it; widening now widens the review for no benefit that cannot
      wait.

## Parked (explicitly deferred)

- **Refreshing the stale `.claude/skills/` install.** Research F0: it is
  gitignored, so it cannot be part of any PR, and it is a Connect re-run rather
  than a code change. Reopens if the staleness causes a second wrong-copy
  mistake — it has already caused one.
