# Checklist — SKILL-023

- [x] Map all 24 MASTERPLAN §4 conduct rules to concise one-line managed-block entries under Scope, Build, Prove, and Conduct.
- [x] Add the compact `## Agent conduct` section to canonical `scripts/agents-block-body.mjs` without changing markers or unrelated orientation text.
- [x] Update the fenced block in `plugins/kanmer/skills/kanmer-setup/SKILL.md` to be byte-identical to the canonical body.
- [x] Add explicit `verify-agents-block` assertions that created/refreshed output carries the conduct section and its canonical rule set.
- [x] Add a core/MCP regression proving an otherwise valid old conduct-less block appears as `agents-block: behind` through the intended staleness surface.
- [x] Refresh this repository’s `AGENTS.md` through the canonical writer and confirm only marker-delimited bytes change.
- [x] Run `npm run verify:agents-block` and the targeted staleness/MCP smoke checks; record successful outputs.
- [x] Run `npm run verify:skills`, `npm run plugin:build`, and main-checkout `npm run plugin:check`; record successful outputs.
- [x] Review the final diff for no duplicate conduct source, no `staleness.ts` literal, and no edits outside the managed markers.

## Progress notes

- Commit `27539dd` on `skill-023-conduct-canon`.
- `npm run verify:agents-block` — 31/31 checks passed, including the explicit conduct section, all 24 ordered rules, all four groups, exact skill mirror, and local block consistency.
- `npm test -w @kanmer/core -- staleness.test.ts` — 40 tests passed; the former conduct-less body is explicitly `agents-block: behind`.
- `node packages/mcp-server/src/smoke.mjs` — 159/159 checks passed, including public `get_status.repo` behind detection.
- `npm run verify:skills` passed; `npm run plugin:build` passed; the canonical main checkout’s `npm run plugin:check` passed with matching bundle bytes and 12 valid skill frontmatters.
- `git diff --check` passed; the AGENTS refresh changes only the marker-delimited managed body.

- Review-blocker remediation: merged current `origin/main` as `395e0e5`, regenerated the plugin MCP bundle from that merged source, and verified its SHA-256 (`4ab82b08…1e645d`) in a standalone non-linked checkout that owns its dependencies.\n- Remediation checks passed: `npm run plugin:check` (30 tools, bundle bytes match, 12 skill frontmatters), `npm run verify:agents-block` (31/31), targeted core staleness (40), MCP smoke (159/159), `npm run verify:skills`, and `git diff --check origin/main...HEAD`.\n

## Closeout

- [x] Confirm PR #77 merged after fresh byte-match review and record merged-main proof.
- [x] Re-inventory and read every ticket document, including nested review and execute scratch files.
- [x] Confirm clean worktree, release the ticket, and remove its merged worktree and local branch.
