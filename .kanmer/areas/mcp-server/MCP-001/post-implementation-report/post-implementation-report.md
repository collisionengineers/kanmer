# Post-implementation report

29 tools. The surface teaches profiles in-line rather than assuming a skill will.

**For review, a gap this made obvious.** `plugin:check` compares tool *names*
and bundle bytes — nothing else. Every description on this surface could be
wrong about behaviour and the rail would stay green. That is not new, but it
matters more now that descriptions carry contract weight (ADR-0009 layer 2).
Generating the reference from the zod shapes would close it; not done here
because it changes how the reference is authored and deserves its own ticket.

`isRegistered` in the GUI's connect.ts JSON-parses a provider's config to decide
whether Kanmer is registered. codex's config is TOML now, so that parse fails
and returns its "indeterminate" `true`. Harmless today — the function is only
consulted for the copySkills peers (opencode, grok, antigravity) and codex is
not among them — but it is a landmine if codex is ever added to that list.
