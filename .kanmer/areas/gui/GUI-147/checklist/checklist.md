# Checklist — GUI-147

- [ ] Step 1 — Add and export a stable `%LOCALAPPDATA%\Kanmer\claude-marketplace` path resolver in `connect.ts` (no existing helper reused; new one, `LOCALAPPDATA`-based with a safe fallback).
- [ ] Step 2 — `stageClaudeMarketplaceRoot` stages into that stable root, refreshing each owned subdirectory (`.claude-plugin`, `.agents`, `plugins/kanmer`) instead of `mkdtemp`/`tmpdir()`; never removes the stable root's parent.
- [ ] Step 3 — Remove the `finally { rm(stagedRoot, ...) }` cleanup in `installSkills`'s marketplace branch; confirm codex behaviour is unchanged (its `stagedRoot` stays `undefined`).
- [ ] Step 4 — Add claude-specific add-vs-update (via `known_marketplaces.json`) and install-vs-uninstall+install (via `installed_plugins.json`) sequencing, followed by a `claude plugin list` read-back that must equal `bundledSkillsVersion()` or fail Connect with a pasteable fallback command, via an injectable runner (mirrors `ConnectOptions.probeRunner`).
- [ ] Step 5 — `skillsStatus()` populates `installedVersion`/`updateAvailable` for claude's marketplace scope from the same read-only `claude plugin list` parse, fails soft on read error; `Settings.tsx` tooltip wording is scope-aware ("for this host" vs "in this project").
- [ ] Step 6 — `disconnectAgent()` runs `claude plugin marketplace remove kanmer` (best-effort) before returning, and does not delete the stable directory; `AGENTS.md` and `FRD-012-connect.md` each get their one-line amendment.
- [ ] [pre-review] Name the production caller for each changed function (`connectAgent`/`updateSkills`/`disconnectAgent`/IPC handlers in `apps/gui/src/main/index.ts`) — no new registration/route needed.
- [ ] [pre-review] Run exact commands without weakening assertions: `npm run verify`; `npm run build -w @kanmer/gui`; the GUI test command (confirm exact script name in `apps/gui/package.json`), filtered to `connect.test.ts` then unfiltered.
- [ ] [pre-review] Confirm the existing MCP-013 invariant test (`marketplaceRoot() + "/plugins/kanmer" === pluginRoot()`) and the existing marketplace-failure tests (`connect.test.ts:845-1010`) remain unmodified and green.
- [ ] [pre-review] Stop at the approved boundary; do not merge, and do not start GUI-140 or any other ticket, unless the executing phase explicitly owns that.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
