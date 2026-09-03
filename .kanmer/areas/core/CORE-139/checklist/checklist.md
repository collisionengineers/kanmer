# Checklist — CORE-139

- [ ] Step 1 — `pr.yml` `verify.if` and concurrency; `board-regate.yml` concurrency, `pull-requests: read`, open-PR guard
- [ ] Step 2 — `scripts/pr-workflow.test.mjs` positive and negative assertions
- [ ] Step 3 — AGENTS.md §6 paragraph (dispatch runs only regate; hook dispatches only with an open PR; operator re-copy)
- [ ] Step 4 — remove dangling `Native` from `scripts/agents-block-body.mjs` and the SKILL.md fenced copy; refresh AGENTS.md; `verify-agents-block.mjs` green
- [ ] Step 5 — `kanmer-setup/SKILL.md:169` unlinked manual reference
- [ ] Step 6 — `verify-skill-prose.mjs` check 21, test helper `spawnValidator`, mutation case
- [ ] Step 7 — `npm run plugin:build && npm run plugin:check`; bundle bytes unchanged
- [ ] Step 8 — full rail green; commit; push; PR `Kanmer: CORE-139`; post-implementation report; move to Review

## Progress notes
