# MCP-013 — Open questions

None blocking. The one question the brief flagged as a possible escalation was
settled by measurement rather than by decision:

> "If making the packaged app carry a marketplace source turns out to be a
> product decision rather than a packaging fix, stop and ask."

It is a packaging fix. Research Finding 3 built a mirror of the proposed packaged
`resources/` layout and installed from it on both hosts, then **called a tool**
that answered from inside that tree. The v2 plan
(`docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30`) already required the
two JSONs; `0f3bb03` shipped the comment without them. Nothing is being decided
that was not already decided and written down.

## Parked (explicitly deferred)

- [ ] Should `.agents/plugins/marketplace.json` be renamed to `kanmer` so both
      marketplaces share one name? **Parked, not chosen.** The two files are read
      by different hosts in different schemas, no caller ever sees both, and a
      rename relocates every existing codex user's plugin cache
      (`…\cache\kanmer-plugins\kanmer\<version>`). FRD-012 R2 already records the
      divergence as legitimate. This ticket adds a rail pinning each hard-coded
      `<plugin>@<marketplace>` string to its own manifest instead.
- [ ] Should Connect offer the packaged app's `resources/` marketplace to hosts
      other than Claude and codex (grok can take a plugin directly)? Owned by
      **[[MCP-014]]**, not here.
- [ ] Whether the plugin should keep advertising an MCP server on codex/`agy` at
      all — **[[MCP-016]]**, deliberately untouched.
