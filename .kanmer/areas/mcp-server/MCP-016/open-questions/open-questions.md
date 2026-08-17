# Open questions — MCP-016

None outstanding. The one decision this ticket existed to make was made by the
operator before work started (**option 2 — stop advertising the MCP server for
codex and Antigravity**), with the reasoning recorded in `plan.md` and amended
into FRD-012 R6.

Two things were settled by taking a default rather than asking, both recorded
here so the default is visible:

- [x] **Delete `plugins/kanmer/.mcp.json` outright rather than emptying it.**
      The operator's scope named "`.codex-plugin/plugin.json` **and/or**
      `.mcp.json` — establish which file each host actually reads". Research
      Finding 2 established that `agy` reads the root `.mcp.json` regardless of
      any manifest, so removing only the manifest key would leave Antigravity
      still advertising it. Deleting the file is the minimum that satisfies the
      decision on both hosts; an emptied file would leave something for a future
      edit to refill and would still make `agy`'s installer report an MCP
      component.
- [x] **The reasoning goes in FRD-012 R6, not a new ADR.** The operator wrote
      "belongs in the ADR **or** the FRD amendment". R6 is the matrix being
      amended and already carries the measurements; what changes is a
      requirement, not an architectural axis. MCP-011 made the same call for the
      same reason. Argued in `plan.md` §Governing docs.

## Parked (explicitly deferred)

- **Upstreaming to codex** (option 4 in the ticket body) — asking for
  `${PLUGIN_ROOT}` expansion, or a `cwd` that defaults to the workspace while
  `args` resolve against the plugin. Out of scope for a repo change; FRD-012 R6
  now states what a host would have to gain for the entry to come back, so the
  condition is written down rather than remembered.
- **`AGENTS.md:149`'s repo-map line** describing the deleted `.mcp.json` — this
  ticket may not commit an `AGENTS.md` change. Filed as its own ticket.
