# Checklist — CORE-023

Derived from plan.md, one box per step.

- [ ] Worktree `.worktrees/core-023` on `core-023-detect-stale-repo` off `origin/main` (which carries MCP-012 `efdc9f3`), `npm install` inside it
- [ ] `packages/core/src/staleness.ts`: types (`StaleState`, `StaleEntry`, `RepoStaleness`) + `detectStaleness()`, every read wrapped, no caching
- [ ] AGENTS.md row: read `<repoRoot>/AGENTS.md`, compare the span between the markers against the reference body; `unstamped` / `behind` / `unknown`, CRLF-normalised
- [ ] Reference body extraction: the marker span of the bundled `kanmer-setup/SKILL.md` — no hardcoded block text
- [ ] Skills rows: iterate the **bundled** relative paths into each destination (`.claude/skills`, `.agents/skills`, `.grok/skills`); never enumerate the destination; report per skill folder
- [ ] Retired skill paths (`RETIRED_SKILL_PATHS`) still present → `behind` (report only, no removal)
- [ ] Skills-stamp row: destination carries Kanmer skills but no `.kanmer-skills-version` → `unstamped`
- [ ] `board-config` rows: dead `statuses`/`priorities`/`docs` → `behind`; missing `questions-resolved` and absent newer keys → `compensated`; skipped when `boardSource === "default"`
- [ ] `mcp-registration` rows: `--root` in a kanmer entry that is not this board → `behind`; one regex over JSON and TOML alike, no new dependency
- [ ] `upToDate` is true iff no row is `behind`
- [ ] `packages/core/src/staleness.test.ts`: clean, block drifted, block absent, markers malformed, skill drifted, **extra user skill produces no row**, retired path, unstamped, `compensated` + still `upToDate`, dead key, foreign registration root, correct registration produces no row, unreadable → `unknown`
- [ ] `packages/core/src/index.ts` exports the detector and its types
- [ ] `packages/mcp-server/src/bundled.ts`: resolve the bundled skills tree per `serverIdentity().build`; consume MCP-012's values, re-derive nothing
- [ ] `packages/mcp-server/src/index.ts`: `repo` block after `server` in `get_status`, plus the tool-description paragraph incl. absence-is-the-signal
- [ ] `packages/mcp-server/src/smoke.mjs`: fresh sandbox reports clean with `agents-block: unstamped`; after a deliberately stale block is written it reports `behind` and `upToDate: false`
- [ ] `tool-reference.md` + `AGENTS.md` §7 prose updated; `git diff AGENTS.md` shows no managed-block change
- [ ] `docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md` written (incl. the enumeration of what migration does not cover) and `link_doc`'d into `refs`
- [ ] `npm run plugin:build`, then `npm run plugin:check` settled in a clean detached checkout (MCP-010's recipe)
- [ ] Rail green: `npm test`, `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol`
- [ ] Post-implementation report written; PR opened
- [ ] Verification run on merged main → `proof` (this box produces proof.md)
- [ ] GUI-surface follow-up ticket filed at closeout

## Progress notes
