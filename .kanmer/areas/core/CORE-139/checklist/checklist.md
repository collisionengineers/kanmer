# Checklist — CORE-139

- [x] Step 1 — `pr.yml` `verify.if` and concurrency; `board-regate.yml` concurrency, `pull-requests: read`, open-PR guard
- [x] Step 2 — `scripts/pr-workflow.test.mjs` positive and negative assertions
- [x] Step 3 — AGENTS.md §6 paragraph (dispatch runs only regate; hook dispatches only with an open PR; operator re-copy)
- [x] Step 4 — remove dangling `Native` from `scripts/agents-block-body.mjs` and the SKILL.md fenced copy; refresh AGENTS.md; `verify-agents-block.mjs` green
- [x] Step 5 — `kanmer-setup/SKILL.md:169` unlinked manual reference
- [x] Step 6 — `verify-skill-prose.mjs` check 21, test helper `spawnValidator`, mutation case
- [x] Step 7 — `npm run plugin:build && npm run plugin:check`; bundle bytes unchanged
- [x] Step 8 — full rail green; commit; push; PR `Kanmer: CORE-139`; post-implementation report; move to Review

## Progress notes

- 2026-09-03T19:20Z: steps 1–6 applied in `.worktrees/core-139`. Focused checks: `node --test scripts/pr-workflow.test.mjs` ✔ (1/1); `node scripts/verify-agents-block.mjs` 31/31; `node scripts/verify-skill-prose.mjs` ALL CHECKS PASSED (check 21: 0 hits); `grep -c "launcher. Native"` over the three files = 0. Deviation from the plan's step 2 wording: two AGENTS.md assertions use `\s+` because the sentences wrap. Heavy checks (skill-prose test file, plugin:build/check, full rail) deferred until the GUI-149 rail on this host finishes, per the one-rail-per-host rule.
- 2026-09-03T19:21Z: plugin:build/check exit 0 (bundle unchanged); full rail exit 0 (`C:\kt-tmp\core139\verify1.log`); commit `35f5f2f246259302069787e1986a03fa835fa0bc`; PR #314 open.
