# Checklist — GUI-147

- [x] Step 1 — Add and export a stable `%LOCALAPPDATA%\Kanmer\claude-marketplace` path resolver in `connect.ts` (no existing helper reused; new one, `LOCALAPPDATA`-based with a safe fallback).
- [x] Step 2 — `stageClaudeMarketplaceRoot` stages into that stable root, refreshing each owned subdirectory (`.claude-plugin`, `.agents`, `plugins/kanmer`) instead of `mkdtemp`/`tmpdir()`; never removes the stable root's parent.
- [x] Step 3 — Remove the `finally { rm(stagedRoot, ...) }` cleanup in `installSkills`'s marketplace branch; confirm codex behaviour is unchanged (its `stagedRoot` stays `undefined`).
- [x] Step 4 — Add claude-specific add-vs-update (via `known_marketplaces.json`) and install-vs-uninstall+install (via `installed_plugins.json`) sequencing, followed by a `claude plugin list` read-back that must equal `bundledSkillsVersion()` or fail Connect with a pasteable fallback command, via an injectable runner (mirrors `ConnectOptions.probeRunner`).
- [x] Step 5 — `skillsStatus()` populates `installedVersion`/`updateAvailable` for claude's marketplace scope from the same read-only `claude plugin list` parse, fails soft on read error; `Settings.tsx` tooltip wording is scope-aware ("for this host" vs "in this project").
- [x] Step 6 — `disconnectAgent()` runs `claude plugin marketplace remove kanmer` (best-effort) before returning, and does not delete the stable directory; `AGENTS.md` and `FRD-012-connect.md` each get their one-line amendment.
- [x] [pre-review] Name the production caller for each changed function (`connectAgent`/`updateSkills`/`disconnectAgent`/IPC handlers in `apps/gui/src/main/index.ts`) — no new registration/route needed.
- [x] [pre-review] Run exact commands without weakening assertions: `npm run verify`; `npm run build -w @kanmer/gui`; the GUI test command (confirm exact script name in `apps/gui/package.json`), filtered to `connect.test.ts` then unfiltered.
- [x] [pre-review] Confirm the existing MCP-013 invariant test (`marketplaceRoot() + "/plugins/kanmer" === pluginRoot()`) and the existing marketplace-failure tests (`connect.test.ts:845-1010`) remain unmodified and green.
- [x] [pre-review] Stop at the approved boundary; do not merge, and do not start GUI-140 or any other ticket, unless the executing phase explicitly owns that.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

### Execution notes (2026-09-02)

Worktree `.worktrees/gui-147`, branch `GUI-147-claude-marketplace-stable`, base `main` @ `7e114cd1`.

Commands: `npm run typecheck -w @kanmer/gui` exit 0; `npm run build -w @kanmer/gui` exit 0; `npm run test -w @kanmer/gui` exit 0 (54 files, 538 tests); `npx vitest run src/main/connect.test.ts` exit 0 (53 tests, 16 new); `npm run verify` recorded in the post-implementation report.

Read-only CLI facts confirmed live before coding (no mutating `claude plugin` command was run at any point): `claude plugin list` block format matches research; `claude plugin install|uninstall` accept `-s <scope>` and `-y`; `claude plugin marketplace` has `add|update|remove|list`. `installed_plugins.json` is `{ version: 2, plugins: { "<plugin>@<marketplace>": [ { scope, version, … } ] } }` — research described it without the `plugins` wrapper, so the reader handles both shapes.

Deviations from the plan, all recorded in the post-implementation report:

1. Add-vs-update is decided on the recorded **path**, not merely on the presence of a `kanmer` key. A registration recorded elsewhere (the deleted temp directory every install up to v0.4.0 left) is `remove` + `add`, because `marketplace update` re-reads that dead source. The plan's literal rule would have failed Connect on exactly the machine that reported the bug.
2. Disconnect runs `plugin uninstall` before `marketplace remove` (the plan named the marketplace removal first). An uninstall resolves against the marketplace that supplied it, so removing the registration first would orphan it. Both are best-effort and neither touches the staged directory.
3. Sequencing stays inside `providers.ts`'s `marketplaceCommands`, now `(marketplaceRoot, state?)`, rather than being special-cased in `connect.ts`. This keeps the existing "connect hands the provider the marketplace root" and staged-descriptor tests exercising the real seam, and keeps codex's spec untouched.
4. The existing test "binds a literal custom branch in the staged Claude marketplace descriptor" gained a `vi.stubEnv("LOCALAPPDATA", <temp>)` line. Staging is durable now, so without it that test would refresh the operator's real `%LOCALAPPDATA%\Kanmer\claude-marketplace`. No assertion was changed, weakened or removed.
