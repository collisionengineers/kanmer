# Checklist — CORE-023

Derived from plan.md, one box per step.

- [x] Worktree `.worktrees/core-023` on `core-023-detect-stale-repo` off `origin/main` (which carries MCP-012 `efdc9f3`), `npm install` inside it
- [x] `packages/core/src/staleness.ts`: types (`StaleState`, `StaleEntry`, `RepoStaleness`) + `detectStaleness()`, every read wrapped, no caching
- [x] AGENTS.md row: read `<repoRoot>/AGENTS.md`, compare the span between the markers against the reference body; `unstamped` / `behind` / `unknown`, CRLF-normalised
- [x] Reference body extraction: the marker span of the bundled `kanmer-setup/SKILL.md` — no hardcoded block text
- [x] Skills rows: iterate the **bundled** relative paths into each destination (`.claude/skills`, `.agents/skills`, `.grok/skills`); never enumerate the destination; report per skill folder
- [x] Retired skill paths (`RETIRED_SKILL_PATHS`) still present → `behind` (report only, no removal)
- [x] Skills-stamp row: destination carries Kanmer skills but no `.kanmer-skills-version` → `unstamped`
- [x] `board-config` rows: dead `statuses`/`priorities`/`docs` → `behind`; missing `questions-resolved` and absent newer keys → `compensated`; skipped when `boardSource === "default"`
- [x] `mcp-registration` rows: `--root` in a kanmer entry that is not this board → `behind`; one regex over JSON and TOML alike, no new dependency
- [x] `upToDate` is true iff no row is `behind`
- [x] `packages/core/src/staleness.test.ts`: clean, block drifted, block absent, markers malformed, skill drifted, **extra user skill produces no row**, retired path, unstamped, `compensated` + still `upToDate`, dead key, foreign registration root, correct registration produces no row, unreadable → `unknown` — **34 tests, all green**
- [x] `packages/core/src/index.ts` exports the detector and its types
- [x] `packages/mcp-server/src/bundled.ts`: resolve the bundled skills tree per `serverIdentity().build`; consume MCP-012's values, re-derive nothing
- [x] `packages/mcp-server/src/index.ts`: `repo` block after `server` in `get_status`, plus the tool-description paragraph incl. absence-is-the-signal
- [x] `packages/mcp-server/src/smoke.mjs`: fresh sandbox reports clean with `agents-block: unstamped`; after a deliberately stale block is written it reports `behind` and `upToDate: false` — **8 new checks, smoke now 142/142**
- [x] `tool-reference.md` + `AGENTS.md` §7 prose updated; `git diff AGENTS.md` shows no managed-block change (7 insertions, 0 deletions, §7 only)
- [x] `docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md` written (incl. the enumeration of what migration does not cover) and `link_doc`'d into `refs`
- [x] `npm run plugin:build`, then `npm run plugin:check` settled in a clean detached checkout (MCP-010's recipe)
- [x] Rail green: `npm test`, `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol`
- [x] Post-implementation report written; PR opened
- [x] Verification run on merged main → `proof` (this box produces proof.md)
- [x] GUI-surface follow-up ticket filed at closeout (GUI-090).

## Progress notes

**The plan's one deviation from research, and why.** Research proposed baking a
content manifest into the standalone bundle at build time, and the operator
authorised it (Q2). The plan chose runtime discovery instead, and implementation
confirmed the reasoning: `classifyBuild()` — which only exists because MCP-012
landed first — makes the bundled skills tree a determined sibling of the running
script in all four shapes, so no manifest is needed. Baking one would have made
the bundle's bytes a function of every skill prose file, and `check-plugin-sync`
compares the committed bundle byte-for-byte, so **every skill-prose edit would
have failed `plugin:check` until somebody rebuilt the MCP bundle** — including
[[SKILL-013]]'s, in flight. Net build-time inputs added: zero.

**The canonical AGENTS body extraction was verified before it was relied on.**
Extracting the span between the two markers from
`plugins/kanmer/skills/kanmer-setup/SKILL.md` yields a 2175-byte string
byte-identical to `scripts/agents-block.mjs`'s `BLOCK_BODY` — measured, not
assumed. `verify-agents-block.mjs` check 7 is what keeps it that way, and it
still passes (26/26). A test asserts the property that matters: move the
*bundle's* idea of canonical and a previously-clean repo goes `behind`, with no
change to the detector. That is what lets SKILL-013 rewrite the body freely.

**Measured on this repo** (36 ms): `.claude/skills` 3 files behind naming
kanmer-report / kanmer-setup / kanmer-tickets, `.agents/skills` 17 files behind
and unstamped, `board.yml` `compensated` for the missing `questions-resolved`
— and **no** row for the user's own `run-kanmer` skill (115 files of
`node_modules` under it, never walked) or for the correctly-rooted `.mcp.json`.
All three of the ticket's acceptance criteria in one call.

**One test of mine was wrong, not the code.** "dead keys on an unmigrated board"
asserted no `board-config` rows at all, but `defaultBoardConfig()` does not set
`repoDocs`, so the (correct) `compensated` row fired. Narrowed the assertion to
"no `behind` row, `upToDate` still true" — which was the actual intent.

**GUI-085 flake confirmed again.** `apps/gui/src/main/kanmerGit.test.ts` failed
once in the full run (`renameBoardBranch > keeps the history, the path and the
remote consistent`) and passed 7/7 alone with `--testTimeout=30000`. Pre-existing,
untouched by this change.

**`plugin:check` cannot run in a linked worktree** — it refuses by design, since
`@kanmer/core` would resolve up to the main checkout and make the comparison
vacuous. Settled in a clean detached clone per MCP-010's recipe:
`plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse`.

- [x] Verification run on merged main → `proof` written at `3e9ee2c`
- [x] GUI-surface follow-up ticket filed: [[GUI-090]]

## Closeout

- PR #54 **MERGED** as `3e9ee2c`; commits recorded (`61d058c`, `0838c74`, `3e9ee2c`).
- ADR-0013 `link_doc`'d into `refs` (deferred from execute — the file only
  existed on the branch, and `link_doc` validates against the main checkout).
- Worktree `.worktrees/core-023` removed; the leftover directory needed a manual
  `rm -rf` after `git worktree remove` refused on `node_modules` and then
  unregistered it anyway. Local branch deleted (`-d`, cleanly). Remote branch
  deleted — the host does not auto-delete.
- Ticket released. Outcome recorded in the ticket body.
- Merge announced to the session so [[MCP-006]], queued behind this on
  `packages/mcp-server/src/index.ts`, can rebase: my edit is confined to the
  `get_status` handler and its description string, and whoever lands next must
  rebuild the 1.4 MB bundle by hand (`npm run plugin:build`) and settle
  `plugin:check` in a clean clone.
