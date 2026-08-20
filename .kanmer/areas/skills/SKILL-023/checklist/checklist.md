# Checklist — SKILL-023

- [ ] Map all 24 MASTERPLAN §4 conduct rules to concise one-line managed-block entries under Scope, Build, Prove, and Conduct.
- [ ] Add the compact `## Agent conduct` section to canonical `scripts/agents-block-body.mjs` without changing markers or unrelated orientation text.
- [ ] Update the fenced block in `plugins/kanmer/skills/kanmer-setup/SKILL.md` to be byte-identical to the canonical body.
- [ ] Add explicit `verify-agents-block` assertions that created/refreshed output carries the conduct section and its canonical rule set.
- [ ] Add a core/MCP regression proving an otherwise valid old conduct-less block appears as `agents-block: behind` through the intended staleness surface.
- [ ] Refresh this repository’s `AGENTS.md` through the canonical writer and confirm only marker-delimited bytes change.
- [ ] Run `npm run verify:agents-block` and the targeted staleness/MCP smoke checks; record successful outputs.
- [ ] Run `npm run verify:skills`, `npm run plugin:build`, and main-checkout `npm run plugin:check`; record successful outputs.
- [ ] Review the final diff for no duplicate conduct source, no `staleness.ts` literal, and no edits outside the managed markers.

## Progress notes
