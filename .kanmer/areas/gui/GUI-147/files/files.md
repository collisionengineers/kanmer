# Files — GUI-147

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/connect.ts` | Replace `stageClaudeMarketplaceRoot`'s `mkdtemp` staging with a stable `%LOCALAPPDATA%\Kanmer\claude-marketplace` root that is refreshed (not deleted) every Connect; remove the `finally { rm(stagedRoot,...) }` cleanup in `installSkills`'s marketplace branch; add claude-specific add-vs-update / install-vs-uninstall / `claude plugin list` verification logic gated on `provider.id === "claude"`; extend `skillsStatus()` to populate `installedVersion`/`updateAvailable` for claude's marketplace scope by reading back the installed plugin version; add disconnect-time `claude plugin marketplace remove kanmer` before any removal of the stable directory (if disconnect removes it at all — see plan). |
| `apps/gui/src/main/connect.test.ts` | New/updated tests: no `mkdtemp` call for claude staging; the staged root lives under an injected `LOCALAPPDATA`; version-mismatch after install is reported as `ok:false` with a pasteable fallback command; marketplace add-vs-update branches on `known_marketplaces.json` presence; plugin install-vs-uninstall+install branches on `installed_plugins.json` presence; disconnect removes the marketplace registration before (if at all) touching the stable directory; existing MCP-013 invariant test (`marketplaceRoot() + "/plugins/kanmer" === pluginRoot()`) stays green untouched. |
| `apps/gui/src/main/providers.ts` | Only touched if the claude `install` spec needs a new optional field/hook to carry the stable-root path or a runner type through to `connect.ts`; the existing `marketplaceCommands(marketplaceRoot)` pure-function shape should be preserved for codex, which is unaffected by this ticket. |
| `AGENTS.md` | Add one line (near the existing `%LOCALAPPDATA%\Kanmer\mcp` / `%LOCALAPPDATA%\Kanmer\bin` gotchas, §4/§10/§13 area) documenting the new `%LOCALAPPDATA%\Kanmer\claude-marketplace` stable staging root and that Connect now forces an install-to-bundled-version instead of relying on `claude plugin install`'s no-op-on-existing behaviour. |
| `docs/functional/frd/FRD-012-connect.md` | Short amendment line near R1/R4 if the registration-matrix wording needs to say the claude marketplace is staged in an installer-owned stable location (not staged-and-discarded) and that disconnect now also removes the marketplace registration, not only the MCP entry. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/connect.ts:152-188` | `pluginRoot()` / `marketplaceRoot()` and the MCP-013 invariant comment — do not touch; the bug is entirely downstream of these two functions, not in them. |
| `apps/gui/src/main/connect.ts:565-605` | `installSkills`'s marketplace branch — the exact place the temp-dir staging and its `finally` cleanup live today, and where the claude-specific verification sequence must be inserted. |
| `apps/gui/src/main/connect.ts:626-669` | `SkillsStatus` interface and `skillsStatus()` — the existing IPC-connected staleness read that must be enriched for claude's marketplace scope rather than replaced. |
| `apps/gui/src/main/connect.ts:710-712` | `ConnectOptions.probeRunner: CodexProbeRunner` — the existing injectable-runner precedent to copy for a claude marketplace runner, so tests do not need a real `claude` binary or a mutated real `~/.claude`. |
| `apps/gui/src/main/connect.ts:1315-1367` | `disconnectAgent()` — currently runs only `provider.register.removeCommands()` for marketplace-kind providers; this is where marketplace-registration removal must be added for claude, ordered before any directory removal. |
| `apps/gui/src/main/providers.ts:856-880` | The claude provider's `register`/`install` spec — `removeCommands` (MCP-registration removal only, no marketplace/plugin removal today) and `marketplaceCommands` (the two-command `add`+`install` list this ticket must make conditional). |
| `apps/gui/src/main/connect.test.ts:845-1000` | Existing MCP-013 marketplace tests — the `useProvider`/`failingCommand`/`succeedingCommand` synthetic-provider pattern and the `describe("the marketplace command is given the marketplace root (MCP-013)")` invariant tests; new tests must not weaken or duplicate these. |
| `apps/gui/src/renderer/src/components/Settings.tsx:468-580` | `ConnectSection` — where `SkillsStatus` is fetched (`getSkillsStatus`) and rendered as the `updateAvailable` badge + "Update skills" button; wording says "in this project", which is wrong for a user-scoped marketplace plugin and needs a small scope-aware tweak. |
| `docs/functional/frd/FRD-012-connect.md` (R1, R1a, R3, R4) | Registration-matrix rows for claude and the ownership/disconnect-symmetry rules this change must keep satisfying. |
| `~/.claude/plugins/known_marketplaces.json`, `~/.claude/plugins/installed_plugins.json` | Real, undocumented but stable Claude Code state files this change reads (never writes) to decide add-vs-update and install-vs-uninstall deterministically, without depending on CLI stderr text. |

## Ripple effects

- `apps/gui/src/shared/ipc.ts` `SkillsStatus` type, `preload/index.ts`, `renderer/src/lib/client.ts`: no signature change expected — only values populated differently for claude's marketplace scope. Confirm during implementation that no field needs adding.
- `npm run verify` and `npm run build -w @kanmer/gui` must still pass; the GUI's vitest suite (`connect.test.ts`) is the primary test surface.
- `scripts/check-plugin-sync.mjs` and `scripts/release.mjs` reference the same claude/codex/antigravity manifests — confirm neither needs updating (they should not, since the marketplace manifest contents are unchanged, only where they are staged).

## Out of scope

- Codex's marketplace flow (`marketplaceCommands` for codex, `codex plugin add`) — unaffected; codex has no equivalent no-op-on-reinstall problem per the ticket body and stays on the existing `marketplaceRoot()` (no staging).
- Grok/Antigravity native-plugin install/uninstall paths (`install.kind === "plugin"`) — a different mechanism entirely, not touched.
- Any change to `pluginRoot()`/`marketplaceRoot()` themselves or the MCP-013 invariant they encode.
- Any change to how the bundled marketplace manifests (`.claude-plugin/marketplace.json`, `plugins/kanmer/.claude-plugin/plugin.json`) are authored or versioned — this ticket only changes where/how Connect stages and installs from them.
