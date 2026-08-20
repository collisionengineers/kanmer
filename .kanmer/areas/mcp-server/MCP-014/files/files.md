# Files — MCP-014

## Files to modify

| Path | Exact responsibility |
|---|---|
| `apps/gui/src/main/providers.ts` | Add an explicit plugin-managed provider contract or extend `InstallSpec`/`RegisterSpec` so one Grok plugin command owns both skills and MCP. Grok receives verified install/uninstall/status commands and no longer declares project config-file registration or copied skills. Keep dispatch unchanged. |
| `apps/gui/src/main/connect.ts` | Execute plugin preflight/install/verify/legacy cleanup in safe order; make Disconnect symmetric and explicitly user-scoped; preserve unrelated files/providers; retain legacy cleanup only after a functioning plugin is proven. |
| `apps/gui/src/main/providers.test.ts` | Pin exact Grok provider shape/commands, no project registration/copy destination, plugin-root argument quoting, unchanged provider matrix and ignore-rule expectations after retirement of `.grok` outputs. |
| `apps/gui/src/main/connect.test.ts` | Test runtime/plugin capability preflight, install success/failure, real-verification seam, cleanup ordering/rollback, idempotent reconnect, user-scoped disconnect warning/uninstall, and preservation of unrelated Grok/Claude/provider files. |
| `apps/gui/src/shared/ipc.ts` and renderer Connect components | Only if needed to represent plugin-wide scope/warning or status accurately. Reuse existing result/confirmation UI where possible; do not add a new generic provider framework. |
| `.gitignore` | Remove `.grok/config.toml` and `.grok/skills/` ignore entries only after Connect no longer writes them and tests prove no legacy residue is needed. Preserve ignore entries for every still-generated provider artifact. |
| `plugins/kanmer/.claude-plugin/plugin.json` | Inspect and normally leave unchanged: Grok consumes this manifest. Modify only if the real supported Grok plugin schema requires a narrowly documented compatibility field. |
| `plugins/kanmer/mcp/claude.mcp.json` | Inspect and normally leave unchanged. Tests pin `${KANMER_NODE:-node}`, `${CLAUDE_PLUGIN_ROOT}`, no cwd and no `--root`. |
| `scripts/check-plugin-sync.mjs` | Extend Grok plugin contract checks: manifest/MCP descriptor/runtime-variable/no-cwd/no-root shape, provider commands and retired project-copy/config ownership where this rail already owns provider/plugin synchronization. |
| `docs/functional/frd/FRD-012-connect.md` | Replace Grok's configFile/copySkills row with user-scoped native plugin lifecycle, runtime prerequisite, inspection/real-tool oracle, migration ordering and global disconnect effect. |
| `apps/gui/release-notes.md` | One-time migration note: Connect installs/verifies plugin before removing owned legacy project state; Node or `KANMER_NODE` prerequisite; Disconnect uninstalls user-scoped plugin for all Grok workspaces. |
| Relevant `docs/manual/` Connect source + generated manual | Add exact install/runtime/verification/uninstall/migration guidance and regenerate. |

## Files to add if a focused adapter improves testability

| Path | Exact responsibility |
|---|---|
| `apps/gui/src/main/grok-plugin.ts` | Optional focused pure/runtime adapter for command construction, installed-state parsing and inspection validation. Add only if keeping this logic in `connect.ts` would materially expand the monolith; no generic plugin framework. |
| `apps/gui/src/main/grok-plugin.test.ts` | Fixtures from real supported CLI output for list/inspect parsing and false-oracle protection. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` §6.3 existing-ticket rescope | Grok moves to real plugin install in 0.4.1; provider claims remain executable. |
| MCP-014 ticket body | Real Grok 0.2.111 commands/outputs and explicit warning that `grok mcp list` is false evidence. |
| `docs/functional/frd/FRD-012-connect.md` R6/R7/provider matrix | Verified plugin manifest/runtime/discovery shape, real tool-call method and Node/`KANMER_NODE` caveat. |
| `apps/gui/src/main/providers.ts` | Current Grok config/copy/dispatch and shared provider types. |
| `apps/gui/src/main/connect.ts` | Registration-first/installSkills/disconnect/peer cleanup ordering that must be specialized safely. |
| GUI-079 and GUI-080 outcomes via Kanmer | Existing ownership and copied-roster fixes. Do not undo them; use their surgical cleanup helpers for migration residue. |
| `plugins/kanmer/.claude-plugin/plugin.json` and `mcp/claude.mcp.json` | The actual Grok-consumed plugin and runtime contract. |
| `scripts/check-plugin-sync.mjs` / provider tests | Existing synchronization rails and version/manifest assumptions. |

## Runtime command contract

The implementation must verify and then pin the supported CLI forms before code is finalized:

```text
grok plugin --help
grok plugin install <absolute plugin root> --trust
grok plugin list          # installation status only, if supported output is stable
grok inspect              # skills/MCP capability inspection; never `grok mcp list`
grok plugin uninstall <verified plugin identifier>
grok -p <controlled prompt that calls get_status> --cwd <clean project>
```

## Ripple effects

- Grok becomes user-scoped plugin-managed rather than project-config/copy-managed.
- Connect/Disconnect wording must disclose all-workspace impact.
- `.grok/config.toml`/`.grok/skills` become legacy cleanup inputs, not outputs.
- AGENTS block/copy-skill peer logic must recalculate without Grok as a copy peer.
- Plugin/runtime availability may refuse Connect where legacy config worked; the error must state Node/`KANMER_NODE` remediation before any cleanup.
- Headless dispatch remains Grok CLI-based and independent from plugin installation logic.

## Do not modify

- Claude `.mcp.json`, Claude/Codex marketplace install, OpenCode/Antigravity copied skills, dispatch args, plugin MCP root discovery, storage/MCP transport or other providers.
- Persist global environment variables, PATH or `KANMER_NODE` automatically.
- Trust `grok mcp list`, parse vague success text without fixtures, or delete legacy state before a real tool call succeeds.
- Build a generic marketplace/plugin abstraction for hypothetical hosts.
