## Raw measurements — 2026-08-16, read-only, this repo

Board:
```
.worktrees/kanmer/.kanmer/version.json → {"format":3,"migratedFrom":2,"migratedAt":"2026-08-16T03:16:16.576Z"}
```
Only `format` is recorded. No product version, no "last reconciled against".

board.yml (`.worktrees/kanmer/.kanmer/data/board.yml`):
- carries an explicit `profiles:` block with NO `questions-resolved` anywhere
- `resolveProfiles()` (packages/core/src/board.ts:85-106) injects it at read time
- so the board file is materially behind the shipped defaults and nothing says so

Skills:
```
.claude/skills/                          12 kanmer-* dirs, mtime Aug 16 20:32
.claude/skills/.kanmer-skills-version    ABSENT
find . -name .kanmer-skills-version      (no results anywhere in the repo)
diff plugins/kanmer/skills/kanmer-research/SKILL.md .claude/skills/kanmer-research/SKILL.md  → identical
no impact-template.md / kanmer-import remain (ticket body's v2-era claim is now out of date —
the tree was refreshed today, but WITHOUT a stamp, so no signal exists either way)
```
plugin.json version = `0.1.0`; root package.json = `0.3.2`.
`bundledSkillsVersion()` reads plugin.json → always returns "0.1.0" → `isNewerVersion`
can never fire for any release. The one shipped staleness signal is inert.

AGENTS.md managed block:
- markers at AGENTS.md:1 and AGENTS.md:20; body matches scripts/agents-block.mjs BLOCK_BODY
- no version attribute on either marker — comparison must be by text/hash

THREE bodies claim to be the block:
1. `scripts/agents-block.mjs` BLOCK_BODY — current (six stages, profiles, get_doc_gates)
2. `plugins/kanmer/skills/kanmer-setup/SKILL.md` fenced block — kept in step by hand
3. `apps/gui/src/main/agentsBlock.ts` BLOCK_BODY — **STALE v2 TEXT**:
   "backlog → researching → planning → implementing → review → verifying → done" (7 stages),
   "research.md + impact.md", "-import" skill.
   Its own header comment: "Phase 8 reconciles the two on one canonical body" — never done.
   `connect.ts:18` imports applyManagedBlock from THIS file, so GUI Connect
   writes the stale block into every repo it touches, today.

Packaged/plugin layouts (bundled-skills location relative to the running server):
- packaged: resources/mcp/kanmer-mcp.cjs  + resources/plugins/kanmer/skills
- plugin:   ${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs + ${CLAUDE_PLUGIN_ROOT}/skills
- dev:      packages/mcp-server/dist/standalone/ (or dist/index.js) + <repo>/plugins/kanmer/skills
Three different relative paths → filesystem walking is fragile; a baked manifest is not.
