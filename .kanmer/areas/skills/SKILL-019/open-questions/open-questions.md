# Open questions — SKILL-019

- [x] **Should Kanmer write path-specific disables into `~/.codex/config.toml`?** — No. Official OpenAI documentation makes this an absolute-path per-user override; using it would mutate global user configuration and leave every new or moved repository needing bespoke entries. Provider-private install destinations are the portable fix.
- [x] **Which Codex surface is canonical?** — The installed `kanmer:` plugin surface. OpenAI recommends plugins for reusable distribution, and FRD-012 already defines the Codex install as a marketplace plugin.
- [x] **Can the provider-private paths be assumed without verification?** — No. ADR-0009 requires installed-binary evidence. Implementation begins with positive-control probes for opencode’s `.opencode/skills` and Antigravity’s `.agent/skills`; a failed probe stops the destination change and sends the design back to planning.

## Parked (explicitly deferred)

No questions parked.
