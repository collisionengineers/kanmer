# Open questions — MCP-014

All product and architecture decisions are resolved; implementation must still capture the exact supported Grok CLI output as test fixtures.

- [x] **Does Grok keep a project `.grok/config.toml` registration?** — No for new Connect. The user-scoped plugin supplies MCP and skills. The old owned entry is legacy residue removed only after plugin install plus real tool verification succeeds.
- [x] **Does Grok keep copied `.grok/skills`?** — No. The plugin owns skills. Remove only the stamped/Kanmer-owned legacy roster after successful verification; preserve user-authored content.
- [x] **What owns install/uninstall?** — Grok’s native `plugin install`/`plugin uninstall` commands, with exact identifier/spelling verified against the supported CLI before coding.
- [x] **Is installation project-scoped?** — No. It is user-scoped. Connect and especially Disconnect must state that installing/uninstalling affects every Grok workspace for that user.
- [x] **What proves installed state?** — `grok plugin list` or `grok inspect` using pinned real output fixtures. Never `grok mcp list`.
- [x] **What proves functional MCP?** — A fresh Grok session in a project with no competing Kanmer Connect registration must invoke `get_status` successfully. Inspect/list alone is not acceptance.
- [x] **How is the MCP runtime selected?** — Existing plugin descriptor `${KANMER_NODE:-node}`. Connect preflights that either Node resolves or an already configured valid `KANMER_NODE` exists. Kanmer does not set global environment/PATH automatically.
- [x] **What if runtime/preflight/install/inspect/tool-call fails?** — Return an actionable failure and leave the working legacy project registration/skills untouched. No partial migration.
- [x] **When is legacy state removed?** — Only after successful plugin install, inspection and real tool call. Then surgically unmerge Kanmer from `.grok/config.toml`, remove stamped copied skills and reconcile AGENTS block based on remaining copy hosts.
- [x] **How does reconnect behave?** — Idempotent plugin install/update/verification followed by no-op legacy cleanup. It must not create project config/skills.
- [x] **How does disconnect behave?** — Warn/confirm user-scoped impact, uninstall the plugin, verify removal, and clean any remaining owned legacy project state. Preserve all unrelated provider/Grok content.
- [x] **Does dispatch change?** — No. Grok’s headless dispatch CLI/args remain unchanged and are tested.
- [x] **Should a generic provider-plugin framework be built?** — No. Add the smallest explicit plugin-managed provider shape/adapter needed for Grok; generalize only when another real host requires the same lifecycle.
- [x] **When may `.grok` ignore entries be removed?** — After tests and real proof establish Connect no longer writes either path and migration cleanup is complete.

## Parked (explicitly deferred)

- [ ] Automatic system/user `KANMER_NODE` configuration — deliberately deferred due global environment ownership and update-path risks.
- [ ] Per-project Grok plugin enablement — defer until Grok exposes a supported measured scope mechanism.
- [ ] Additional native plugin hosts — handled by their own measured tickets, not this abstraction.
