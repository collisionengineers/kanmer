# Post-implementation report — GUI-147

Claude Connect now stages its plugin marketplace in an installer-owned location that outlives the Connect that wrote it, forces an already-installed plugin to the bundled version, refuses to report success unless the host confirms that version, and surfaces the version it read through the existing skills-staleness read.

- Branch: `GUI-147-claude-marketplace-stable`
- Worktree: `.worktrees/gui-147`
- Base: `main` @ `7e114cd117ef720c20797e2bf9f5cf58643a94e6` (`delivery.baseShaState: resolved`)
- Commit: `ff6a87c8`

## What changed and why

| File | Change |
|---|---|
| `apps/gui/src/main/connect.ts` | New exported `claudeMarketplaceStableRoot()` resolving `%LOCALAPPDATA%\Kanmer\claude-marketplace` from `process.env.LOCALAPPDATA` with a `homedir()` fallback. `stageClaudeMarketplaceRoot()` stages into it, refreshing each owned subdirectory (`.claude-plugin`, `.agents`, `plugins/kanmer`) and never deleting the root — including on failure, where the old code deleted the whole staged tree. The `finally { rm(stagedRoot, …) }` in `installSkills`'s marketplace branch is gone. New `claudeMarketplaceHostState()` reads `~/.claude/plugins/known_marketplaces.json` and `installed_plugins.json` (read-only, absent/malformed = nothing recorded) and passes the result to `marketplaceCommands`. New `verifyInstalledMarketplaceVersion()` runs the host's read-only version read-back after the install and fails Connect on mismatch, absence or an unreadable read; `readMarketplaceInstalledVersion()` is its soft-failing twin for `skillsStatus()`. `skillsStatus()` populates `installedVersion`/`updateAvailable` for a marketplace host that declares a read-back. `disconnectAgent()` runs the marketplace host's own removals first. `ConnectOptions` gains two test seams: `claudePluginStateDir` and `hostVersionRunner`. `installSkills`, `updateSkills` and `skillsStatus` now thread `ConnectOptions`. |
| `apps/gui/src/main/providers.ts` | `InstallSpec`'s marketplace variant gains `marketplaceCommands: (marketplaceRoot, state?)`, optional `installedVersion: MarketplaceVersionCheck` and optional `hostRemoveCommands`. New exported `CLAUDE_MARKETPLACE`, `CLAUDE_PLUGIN_REF`, `MarketplaceHostState`, `MarketplaceVersionCheck` and the pure `parseMarketplacePluginVersion()`. Claude's spec now emits state-dependent verbs and declares its read-back and its disconnect removals. codex's spec is byte-for-byte unchanged and ignores `state`, so its behaviour is identical. |
| `apps/gui/src/main/connect.test.ts` | New describe block `Claude's marketplace is staged where the host can keep reading it (GUI-147)` — 14 tests, listed below. One line added to the existing staged-descriptor test (see deviation 4). `vi.unstubAllEnvs()` added to the file's global `afterEach`. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | "Update skills" tooltip is scope-aware: a marketplace host's plugin is installed *for this host*, not copied *in this project*. Wording only — no new state, prop, IPC channel or `SkillsStatus` field. |
| `AGENTS.md` | §8 gotcha 24: the stable staging root, the no-op-on-existing install, the JSON-not-CLI-text decision rule, the mandatory version read-back, and the rule that tests must never run a mutating `claude plugin` command. |
| `docs/functional/frd/FRD-012-connect.md` | Two `**Amended (GUI-147):**` clauses — on R2's Claude Code row (durable staging, conditional verbs, required read-back, and the retirement of "a marketplace host reports no installed version" for Claude alone) and on R4 (Claude's disconnect now has marketplace state of its own to reverse, in a stated order, and does not delete the installer-owned directory). |

## Mapping to the governing docs

- **FRD-012 R1** — Claude's registration *mechanism* is unchanged; only where the marketplace is staged and how forcefully the plugin is installed changed.
- **FRD-012 R1a** — the two new disconnect commands remove only Claude's own marketplace and its own plugin, run only from Claude's disconnect path, and are declared by Claude's provider spec rather than hard-coded in `connect.ts`.
- **FRD-012 R3** — `ensureAgentsBlock` still runs first in `installSkills`; the existing marketplace-host AGENTS.md idempotence/retention test is untouched and green.
- **FRD-012 R4** — closes the gap the requirement always implied: Connect now writes durable host state, so disconnect removes it. Amended in the FRD in the same PR.
- **MCP-013** — the invariant `marketplaceRoot() + "/plugins/kanmer" === pluginRoot()` and both its tests are untouched; the failure contract (`ok:false` carrying the command, never a note on a green result) is the shape every new failure path returns; no control flow reads CLI text.
- **AGENTS.md §7** — no renderer runtime import of `@kanmer/core` was added; `Settings.tsx` changed one string expression.

## Tests

New, all in `connect.test.ts`:

1. the stable root follows `LOCALAPPDATA`, returns the same path every call, and does not throw when the variable is absent;
2. Connect stages into that root, the marketplace manifest and branch-bound MCP descriptor are still there *after* Connect returns, a second Connect refreshes the same path, and a file the bundle no longer ships does not survive the refresh;
3. a failed marketplace command leaves the staged root intact;
4. the host state derived from fixtures is `absent` / `staged` / `elsewhere` × `pluginInstalled`, for four fixture combinations including the exact v0.4.0 upgrade case;
5. missing state files are nothing recorded, not an error;
6. the **real** Claude provider turns each state into the right verbs, including `remove`+`add` for a registration recorded elsewhere and `uninstall` before `install` for an existing plugin, and is unchanged when given no state;
7. the **real** read-back parser against a real-shape transcript: present, absent, empty, and the same plugin at two scopes;
8. a version mismatch fails Connect with `result.command` equal to the exact pasteable repair and both versions in the output;
9. an absent plugin after the install fails Connect;
10. an unreadable read-back fails Connect rather than reporting success;
11. a confirmed bundled version reports success;
12. `skillsStatus("claude")` carries the installed version, flags a disagreement, soft-fails to `null`, and leaves codex's status untouched;
13. disconnect runs exactly `plugin uninstall` then `marketplace remove` and keeps the staged directory;
14. a marketplace host declaring no host removals runs none.

No existing assertion was weakened, removed or reordered.

## Commands

- `npm run typecheck -w @kanmer/gui` — exit 0
- `npm run build -w @kanmer/gui` — exit 0
- `npx vitest run src/main/connect.test.ts --no-file-parallelism` (in `apps/gui`) — exit 0, 53 tests
- `npm run test -w @kanmer/gui` — exit 0, 54 files / 538 tests
- `npm run verify` — exit 0 (full rail: core, GUI, mcp-server http, scripts, verify-docs, agents-block 31/31, plugin:check)

## Deviations from the plan

1. **Add-vs-update is decided on the recorded path, not merely on a key's presence.** The plan said "has a `kanmer` key already? → update". Taken literally that runs `claude plugin marketplace update kanmer` against the deleted temp directory every install up to v0.4.0 recorded — i.e. it would fail on exactly the machine that reported this bug. A registration recorded anywhere other than the staged root is therefore `remove` + `add`. Same constraint honoured: decided from the JSON files, never from CLI text.
2. **Disconnect order.** The plan said the marketplace registration goes first. An uninstall resolves against the marketplace that supplied it, so removing the registration first would orphan the plugin. Claude's `hostRemoveCommands` is `plugin uninstall` then `marketplace remove`; both are best-effort and neither touches the staged directory, which the plan's ordering note was really about.
3. **Sequencing lives in `providers.ts`, not as a `provider.id === "claude"` special case in `connect.ts`.** The plan allowed a `providers.ts` touch "only if a typed field is needed"; one was. Keeping the decision in `marketplaceCommands(root, state?)` preserves the existing "connect hands the provider the marketplace root" and staged-descriptor tests as live coverage of the real seam, and leaves codex's spec untouched.
4. **One line added to an existing test.** `binds a literal custom branch in the staged Claude marketplace descriptor` now stubs `LOCALAPPDATA` to a temp directory. Staging is durable now, so without it that test would refresh the operator's real `%LOCALAPPDATA%\Kanmer\claude-marketplace`. Every assertion in that test is unchanged.
5. **`installed_plugins.json`'s shape.** Research described it as keyed by `<plugin>@<marketplace>` at the top level; the live file (claude 2.1.233) is `{ version: 2, plugins: { … } }`. The reader accepts both.

## What was deliberately not done

No mutating `claude plugin …` or `claude mcp …` command was run at any point in this lane. Read-only `claude plugin list`, `claude plugin install --help`, `claude plugin uninstall --help` and `claude plugin marketplace --help` were used to confirm the transcript format and the `-s user -y` flags before coding. **The live Connect run belongs to verification/promotion, not here** — the ticket's own verification list names `/reload-plugins` on a real machine after Connect, and an N → N+1 app upgrade yielding `claude plugin list` = N+1, and neither can be established without mutating a real Claude Code install.

The operator's real `%LOCALAPPDATA%\Kanmer\claude-marketplace` was confirmed untouched after the test run (descriptor mtime still `2026-09-01T23:44:46Z`, branch still `kanmer-board`, plugin version still 0.4.0).

## Risks and follow-ups

- **`skillsStatus("claude")` now spawns a subprocess.** The Settings panel's staleness read shells out to `claude plugin list` (60 s timeout, soft-failing). On a machine without `claude` on PATH this costs one failed spawn per read and renders as "unknown", as before. If the panel is found to poll this often enough to matter, cache it — no behaviour depends on it being live.
- **The version read-back does not check `Status: enabled`.** A plugin at the right version but disabled by the user passes. Deliberate: the ticket asks about version, and disabling is a user's own choice about their host.
- **`marketplace update` is still used for the already-correct case.** If that verb is ever found to fail against a directory source, the `remove`+`add` path is one state value away.

## For kanmer-verify

Run at the merge SHA: `npm run verify`, `npm run build -w @kanmer/gui`, `npm run test -w @kanmer/gui`. The claim-bearing tests are the `Claude's marketplace is staged where the host can keep reading it (GUI-147)` block in `apps/gui/src/main/connect.test.ts` plus the untouched MCP-013 blocks above it.

The two host-integration checks from the ticket body (`/reload-plugins` loading the plugin after a real Connect; an N → N+1 app upgrade yielding `claude plugin list` = N+1) require mutating a real Claude Code install and are promotion-time evidence, not something this lane could establish without violating its own scope.
