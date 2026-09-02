# Plan — GUI-147: Stable Claude marketplace staging + forced plugin upgrade + version surfaced in staleness read

## Objective
Claude Connect stages its marketplace in an installer-owned, never-deleted-while-registered location; forces an already-installed `kanmer@kanmer` plugin to the bundled version on every Connect; fails Connect (with a pasteable fallback) when `claude plugin list` does not confirm that version; and surfaces the installed Claude plugin version next to the existing skills-staleness read. codex and the native Grok/Antigravity plugin paths are unchanged.

## Starting state
Verified against `apps/gui/src/main/connect.ts` at HEAD `6d5e68f9080aa25baaf6092ca7984cd1c1cd8a38` (repo HEAD `7e114cd1`, v0.4.0):
- `stageClaudeMarketplaceRoot()` (`connect.ts:195-230`) copies into `mkdtemp(tmpdir(), "kanmer-claude-marketplace-")`; `installSkills`'s marketplace branch (`connect.ts:581-604`) `finally`-removes it after running `provider.install.marketplaceCommands(...)`.
- claude's `marketplaceCommands` (`providers.ts:874-877`): `claude plugin marketplace add <root>` then `claude plugin install kanmer@kanmer` — no upgrade path, no verification.
- `skillsStatus()` (`connect.ts:642-669`) returns `installedVersion:null, updateAvailable:false` unconditionally for every marketplace-kind provider.
- `disconnectAgent()` (`connect.ts:1315-1367`) runs only `provider.register.removeCommands()` for marketplace-kind providers (claude: MCP-registration removal only).
- Live CLI facts confirmed read-only: `claude plugin marketplace {add,update,remove,list}`, `claude plugin {install,uninstall,update,list}` exist as described; `claude plugin install` on an already-installed plugin does not upgrade it; `known_marketplaces.json` and `installed_plugins.json` under `homedir()/.claude/plugins/` are the deterministic, read-only sources for add-vs-update and install-vs-uninstall decisions; `%LOCALAPPDATA%\Kanmer\<subdir>` is the established installer-owned convention (AGENTS.md gotchas §4/§10/§13), with no existing Node-side resolver — `process.env.LOCALAPPDATA` is the only Node equivalent.
Evidence: `research/research.md`@`51c03add122412e3`, `files/files.md`@`893dd0bb92120d76`.

## Governing docs
- **FRD-012 R1**: Meets — claude's registration mechanism (`claude mcp add`/marketplace install) is unchanged; only *where* the marketplace is staged and *how forcefully* the plugin is upgraded change.
- **FRD-012 R1a** (one host, one file / remove only what is owned): Meets — disconnect gains `claude plugin marketplace remove kanmer`, which is claude's own marketplace registration, removed by claude's own disconnect path only.
- **FRD-012 R3** (AGENTS.md universal orientation layer): Meets — unchanged; `ensureAgentsBlock` still runs first in `installSkills`.
- **FRD-012 R4** (disconnect reverses exactly what connect wrote): Meets, and closes a gap — today connect does not durably write a marketplace registration Claude keeps working (the temp dir is gone by the time disconnect could run), so disconnect had nothing marketplace-shaped to reverse; once staging is durable, disconnect must remove the marketplace registration it now durably created. Amend FRD-012 with a short line noting this (see Step 6) — this is a wording amendment reflecting new durable state, not a policy change, so it does not require the "Modifies" escalation.
- **MCP-013 invariant** (`marketplaceRoot() + "/plugins/kanmer" === pluginRoot()`): Meets — untouched; the stable root is *where the copy of that tree is staged*, not the tree's shape.

## Required changes
1. Resolve `%LOCALAPPDATA%\Kanmer\claude-marketplace` as a stable Node-side path (no existing helper to reuse; add one).
2. Replace `mkdtemp`-based staging with a refresh-in-place of that stable directory on every Connect; never delete the directory itself as part of Connect or install.
3. After staging, decide `marketplace add` vs `marketplace update kanmer` by reading `known_marketplaces.json` (has a `kanmer` key already? -> update; else -> add) rather than parsing CLI output.
4. Decide `plugin install` vs `plugin uninstall` + `plugin install` by reading `installed_plugins.json` (has `kanmer@kanmer` scope `user`? -> uninstall then install; else -> install only).
5. After the install step, run `claude plugin list` (read-only) and parse the `kanmer@kanmer` block's `Version:` line; require it to equal `bundledSkillsVersion()`. On any mismatch, absence, or command failure, return the existing `SkillsInstallOutcome.failure` shape (command + output) so Connect reports `ok:false` with the pasteable command, per the existing MCP-013 failure contract — never fold it into a note on an `ok:true` result.
6. Extend `skillsStatus()` so claude's marketplace scope populates `installedVersion` (from the same `claude plugin list` read) and `updateAvailable` (mismatch vs `bundledVersion`), reusing the existing `SkillsStatus` fields/IPC — no new channel or type field.
7. Extend `disconnectAgent()` so claude's marketplace-kind disconnect runs `claude plugin marketplace remove kanmer` before any removal of the stable directory, ordered so the registration is gone first (FRD-012 R4). Decide in this step whether disconnect removes the stable directory at all, or leaves it for the next Connect to refresh — recommendation: **do not delete the directory on disconnect**; only remove the marketplace registration and the installed plugin (`claude plugin uninstall kanmer@kanmer`), matching "never deleted while the marketplace is registered" literally (once unregistered, an orphaned directory is inert and the next Connect overwrites it anyway) and avoiding a second `rm` failure mode.
8. Add an injectable runner (mirroring `ConnectOptions.probeRunner: CodexProbeRunner`) so all of the above (exec calls, the two JSON reads, `claude plugin list` parsing) can be stubbed in tests without a real `claude` binary or a mutated real `~/.claude`.
9. Small renderer copy fix in `Settings.tsx`: the "Update skills" tooltip currently says "...in this project" for every scope; for `scope==="marketplace"` say "...for this host" instead, since claude's plugin is user-scoped, not project-scoped.

> **Advisory check**: none of the above leaves an unresolved `investigate`/`decide`/`choose` — the operator-approved outcome section fixed every decision; the one CLI behaviour not exercised (add-vs-update conflict text) is deliberately avoided by deciding from the JSON files instead of CLI text.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `apps/gui/src/main/connect.ts` | Stable staging, add/update + install/uninstall sequencing, version verification, `skillsStatus()` enrichment, disconnect ordering, injectable runner |
| Modify | `apps/gui/src/main/providers.ts` | Only if claude's `install` spec needs a new optional field to type the runner/hook through; codex's spec stays untouched |
| Modify | `apps/gui/src/main/connect.test.ts` | New/updated tests per Ordered steps below |
| Modify | `apps/gui/src/renderer/src/components/Settings.tsx` | Scope-aware tooltip wording only |
| Modify | `AGENTS.md` | One line documenting the new `%LOCALAPPDATA%\Kanmer\claude-marketplace` convention and the forced-upgrade behaviour |
| Modify | `docs/functional/frd/FRD-012-connect.md` | Short amendment near R1/R4 (durable marketplace registration; disconnect symmetry) |

## Do not modify
- `pluginRoot()`, `marketplaceRoot()`, and the MCP-013 invariant they encode (`connect.ts:152-188`).
- codex's `install.marketplaceCommands` / registration path (`providers.ts` codex block) and its tests.
- Grok/Antigravity native-plugin (`install.kind==="plugin"`) install/uninstall paths.
- `.claude-plugin/marketplace.json`, `plugins/kanmer/.claude-plugin/plugin.json`, `plugins/kanmer/mcp/claude.mcp.json` manifest *contents* (only how/where they are staged changes).
- Any real mutation of the operator's actual `~/.claude` state during planning/testing — all new logic must be exercised through the injectable runner or a temp `HOME`/`LOCALAPPDATA`, never the developer's live Claude install.

## Constraints
- Windows-only feature (the app ships Windows-only per existing `%LOCALAPPDATA%\Kanmer\mcp`/`\bin` conventions); the new helper must still resolve deterministically under vitest on the CI runner (inject `LOCALAPPDATA` via `process.env` in tests, matching the existing `antigravity-plugin-config.test.mjs` pattern).
- Never parse CLI stderr for control flow (MCP-013 lesson: only surface it verbatim in a failure). Add-vs-update and install-vs-uninstall must be decided from the two JSON files.
- Refreshing the stable directory must not create a window where `claude plugin marketplace add`/`update` sees a missing marketplace manifest — refresh each of the three owned subroots (`.claude-plugin`, `.agents`, `plugins/kanmer`) rather than removing the parent directory itself.
- Backward compatible with a machine that has no prior `kanmer` marketplace/plugin at all (fresh install: `known_marketplaces.json`/`installed_plugins.json` may not exist or lack a `kanmer` entry — treat as "not registered"/"not installed", not an error).

## Ordered steps

### Step 1 — Resolve the stable marketplace root
- Preconditions: none.
- Files: `apps/gui/src/main/connect.ts`
- Symbols: new `claudeMarketplaceStableRoot(): string` (or equivalently named) alongside `pluginRoot`/`marketplaceRoot`
- Change: add a small helper resolving `join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Kanmer", "claude-marketplace")`; export it (tests need to assert it, mirroring how `pluginRoot`/`marketplaceRoot` are exported).
- Preserved behaviour: `pluginRoot()`/`marketplaceRoot()` unchanged.
- Forbidden: hard-coding a literal path; reading any Electron `app.getPath` key that does not exist.
- Negative cases: `process.env.LOCALAPPDATA` unset (non-Windows dev/test) falls back without throwing.
- Tests: `connect.test.ts` — assert the function's output changes when `process.env.LOCALAPPDATA` is set to a temp dir in the test.
- Commands: `npm run build -w @kanmer/gui`
- Expected output: type-checks; no runtime call yet.
- Done when: the helper exists and is exported.
- Deviation stop: if Electron actually does expose a documented `localAppData`-equivalent `getPath` key on Windows, stop and use it instead of `process.env.LOCALAPPDATA` — verify against the installed Electron version's typings before assuming otherwise.

### Step 2 — Replace mkdtemp staging with a refreshed stable directory
- Preconditions: Step 1 done.
- Files: `apps/gui/src/main/connect.ts`
- Symbols: `stageClaudeMarketplaceRoot`
- Change: replace `mkdtemp(join(tmpdir(), ...))` with `claudeMarketplaceStableRoot()`; before copying each of `.claude-plugin`, `.agents`, `plugins/kanmer`, remove that specific subdirectory under the stable root (if present) and recopy fresh from `marketplaceRoot()`, so retired files do not linger; keep the `KANMER_BOARD_BRANCH` env-binding write into the staged `claude.mcp.json` exactly as today; return the stable root (rename the function or its return-value comment to stop calling it "temporary").
- Preserved behaviour: staged descriptor still carries the selected board branch; `existsSync` guard before each `cp` retained.
- Forbidden: removing the stable root's parent directory; leaving the directory in a half-copied state on error (keep the existing try/catch, but do not `rm` the whole root on failure — only fail loudly).
- Negative cases: first-ever Connect on a machine with no prior `%LOCALAPPDATA%\Kanmer\claude-marketplace` — `mkdir(..., {recursive:true})` before copying.
- Tests: assert no `mkdtemp` call happens for claude (spy on `node:fs/promises` `mkdtemp` or assert the returned root is under the injected `LOCALAPPDATA`, not under `tmpdir()`); assert a second Connect call reuses/refreshes the same path rather than creating a new one; assert a file manually added under the stable root's `plugins/kanmer` that the bundle no longer ships is removed after refresh.
- Commands: `npm test -w @kanmer/gui -- connect.test.ts` (or the project's actual vitest invocation — confirm exact script name in `apps/gui/package.json` during execute)
- Expected output: staged root path contains `Kanmer\claude-marketplace`; test asserts pass.
- Done when: `stageClaudeMarketplaceRoot()` never calls `mkdtemp`/`tmpdir()` for claude.
- Deviation stop: if refreshing per-subdirectory proves unsafe (e.g. a live Claude session reads mid-refresh in a way that matters), stop and report — do not silently switch to a full-root swap without recording why.

### Step 3 — Remove the temp-dir cleanup in installSkills
- Preconditions: Step 2 done.
- Files: `apps/gui/src/main/connect.ts`
- Symbols: `installSkills`
- Change: delete the `finally { if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true }); }` block in the marketplace branch (~`connect.ts:601-604`); the stable directory now persists across the whole app lifetime, refreshed only by Step 2.
- Preserved behaviour: codex's `stagedRoot` remains `undefined` always, so this is a no-behaviour-change for codex.
- Forbidden: leaving any residual cleanup path for claude's stable directory inside `installSkills`.
- Negative cases: a Connect that fails mid-way (e.g. `marketplace add` fails) must not delete the stable directory it just refreshed.
- Tests: assert the stable directory still exists on disk after a successful Connect and after a failed one.
- Commands: `npm run verify`
- Expected output: no directory removal observed for claude in any test path.
- Done when: the `finally` block is gone and both success/failure tests confirm persistence.
- Deviation stop: none expected; straightforward deletion.

### Step 4 — Add/update and install/uninstall sequencing with version verification
- Preconditions: Steps 1-3 done.
- Files: `apps/gui/src/main/connect.ts`, `apps/gui/src/main/providers.ts` (only if a new optional hook/type is needed to keep claude's spec typed)
- Symbols: `installSkills`, `SkillsInstallOutcome`, a new injectable runner type (e.g. `ClaudeMarketplaceRunner`) added to `ConnectOptions`, `AgentProvider`'s claude `install` spec
- Change: inside `installSkills`'s marketplace branch, special-case `provider.id === "claude"` (mirroring the existing `provider.id === "claude" ? await stageClaudeMarketplaceRoot(...) : undefined` precedent) to: (a) read `known_marketplaces.json` under `homedir()/.claude/plugins/` — if it already has a `kanmer` key, run `claude plugin marketplace update kanmer`, else `claude plugin marketplace add <stableRoot>`; (b) read `installed_plugins.json` under the same root — if `kanmer@kanmer` scope `user` already has an entry, run `claude plugin uninstall kanmer@kanmer -s user -y` then `claude plugin install kanmer@kanmer -s user -y`, else just `claude plugin install kanmer@kanmer -s user -y`; (c) run `claude plugin list`, parse the `kanmer@kanmer` block's `Version:` line, compare to `bundledSkillsVersion()`; on any failure or mismatch return `{ note, failure: { command, output } }` exactly like the existing failed-command path, with `output` naming the expected vs actual version and a pasteable fallback (`claude plugin uninstall kanmer@kanmer -y && claude plugin install kanmer@kanmer -y`).
- Preserved behaviour: codex's marketplace branch (the existing generic `for (const cmd of provider.install.marketplaceCommands(...))` loop) is completely untouched and still used for codex.
- Forbidden: parsing CLI stderr text for control-flow decisions; running any command against the operator's real `~/.claude` from a test.
- Negative cases: `known_marketplaces.json`/`installed_plugins.json` missing entirely (fresh machine) treated as "not registered"/"not installed"; `claude plugin list` output containing no `kanmer@kanmer` block treated as a verification failure, not a crash.
- Tests: four cases — (1) marketplace absent -> `add` runs, not `update`; (2) marketplace present -> `update` runs, not `add`; (3) plugin absent -> single `install` runs; (4) plugin present -> `uninstall` then `install` run, in that order; (5) `claude plugin list` reports a version that does not equal `bundledSkillsVersion()` -> `ok:false` with fallback command in `output`; (6) versions match -> `ok:true`. Each test injects the runner from Step 8 and a fixture `known_marketplaces.json`/`installed_plugins.json`/`claude plugin list` stdout — no real `claude` binary invoked.
- Commands: `npm run verify`
- Expected output: all six new/updated test cases pass; existing MCP-013 tests (`connect.test.ts:845-1010`) remain green.
- Done when: `get_doc_gates`'s stated verification bullets ("version mismatch after install is reported as a failure") are exercised by a passing test.
- Deviation stop: if `claude plugin list`'s text format differs from the format captured in research (`❯ name@marketplace\n  Version: X\n  Scope: Y\n  Status: Z`), stop and re-verify against a live `claude plugin list` run before hard-coding a parser.

### Step 5 — Surface the installed version in the staleness read
- Preconditions: Step 4 done (the `claude plugin list` parse exists and can be reused).
- Files: `apps/gui/src/main/connect.ts`, `apps/gui/src/renderer/src/components/Settings.tsx`
- Symbols: `skillsStatus`, `ConnectSection` (renderer)
- Change: in `skillsStatus()`, when `id === "claude"` and `provider.install.kind === "marketplace"`, run the same read-only `claude plugin list` + parse used in Step 4 (factor it into a shared helper) and populate `installedVersion`/`updateAvailable` instead of returning the unconditional `base`; leave codex's marketplace scope as today (`installedVersion:null`). In `Settings.tsx`, adjust the "Update skills" tooltip text to say "for this host" rather than "in this project" when `skills[p.id]?.scope === "marketplace"`.
- Preserved behaviour: existing `updateAvailable` badge/button wiring (`Settings.tsx:553-575`) unchanged structurally; project-scope (`grok`'s copy-skills case, if any) wording unaffected.
- Forbidden: adding a new IPC channel, a new `SkillsStatus` field, or a new renderer feature surface.
- Negative cases: `claude plugin list` read fails (e.g. `claude` not on PATH) — `skillsStatus()` must not throw; fall back to `installedVersion:null` like today (staleness reads must fail soft, matching the codebase's stated `staleness.ts` rule "nothing here throws").
- Tests: `skillsStatus("claude", root)` returns a populated `installedVersion` matching a fixture `claude plugin list` output, and `updateAvailable:true` when it differs from `bundledSkillsVersion()`.
- Commands: `npm run verify`
- Expected output: new test passes; no change to any codex/grok/antigravity `skillsStatus` test.
- Done when: `getSkillsStatus("claude")` reflects the real installed version end-to-end through the existing IPC.
- Deviation stop: if reaching this state requires a new field on `SkillsStatus` after all (e.g. because `installedVersion`'s existing meaning for project-scope providers would become ambiguous), stop and confirm the field's dual meaning is acceptable before landing it silently.

### Step 6 — Disconnect ordering + docs
- Preconditions: Steps 1-5 done.
- Files: `apps/gui/src/main/connect.ts`, `AGENTS.md`, `docs/functional/frd/FRD-012-connect.md`
- Symbols: `disconnectAgent`
- Change: for claude specifically, before/alongside the existing `provider.register.removeCommands()` loop, run `claude plugin marketplace remove kanmer` (best-effort, `.catch(() => undefined)` matching the existing pattern for `removeCommands`) — do **not** delete the stable `claude-marketplace` directory on disconnect (per the plan's Step-7-equivalent decision in Required changes item 7); add the AGENTS.md line and the FRD-012 amendment line.
- Preserved behaviour: AGENTS.md-block retention rule for marketplace hosts (FRD-012 R4, tested at `connect.test.ts` "ensures the managed block for marketplace hosts idempotently and retains it on disconnect") stays unchanged.
- Forbidden: removing the stable directory as part of disconnect; removing another provider's marketplace/plugin.
- Negative cases: disconnect called when no `kanmer` marketplace is registered (e.g. never connected) — `claude plugin marketplace remove kanmer` fails harmlessly, swallowed like other best-effort cleanup commands.
- Tests: disconnect test asserting `claude plugin marketplace remove kanmer` (or the injected runner's equivalent call) happens before disconnect returns, and that the stable directory still exists afterward.
- Commands: `npm run verify`
- Expected output: new disconnect test passes; existing disconnect tests (AGENTS.md retention, etc.) remain green.
- Done when: disconnect test proves ordering (registration removed) without asserting on directory deletion (since none should occur).
- Deviation stop: none expected.

## Acceptance checks
- Production caller: `installSkills`/`skillsStatus`/`disconnectAgent` are already the production entry points invoked from `connectAgent`/`updateSkills`/the IPC handlers in `apps/gui/src/main/index.ts` — no new registration or route needed.
- Runtime dependency: no new npm dependency; only `node:fs`, `node:path`, `node:os`, `node:child_process` already imported in `connect.ts`.
- Tests prove the claim without weakened assertions: the version-mismatch test must assert `ok:false` and the exact fallback command text, not merely `ok !== true`.

## Commands
- `npm run verify` (repo-wide rail)
- `npm run build -w @kanmer/gui`
- GUI test command: confirm the exact script in `apps/gui/package.json` during execute (likely `npm test -w @kanmer/gui` or `npm run test -w @kanmer/gui`); run it filtered to `connect.test.ts` first, then unfiltered.

## Failure and deviation rules
Stop and report on: any need to run a real, state-mutating `claude plugin`/`claude plugin marketplace` command against a developer machine's actual `~/.claude`; any discovery that `claude plugin list`'s text format differs from what research captured; any discovery that `SkillsStatus`/IPC truly needs a new field (Step 5's deviation stop); any scope creep into codex/Grok/Antigravity paths; any dependency addition.

## Stop condition
Stop at a green PR meeting this plan's checklist, with `npm run verify` and the GUI build/test commands passing and the post-implementation report written. Do not merge, and do not start GUI-140 or any other ticket, unless the phase in progress explicitly owns that.
