# Proof — SKILL-024: kanmer-setup reconciles an AGENTS.md skeleton

## Merged result

Verified on current `main` at merge commit `ccd1abd80b86fd3c04bdce12bd457484a7e61805` (PR [#79](https://github.com/collisionengineers/kanmer/pull/79), merged 2026-08-20T22:22:51Z).

## Evidence

- `node --test scripts/verify-skill-prose.test.mjs` — **3/3 passed**, including the new setup guide-skeleton contract.
- `npm run verify:agents-block` — **31/31 passed**, covering missing-file creation, existing-content preservation, refresh/idempotency, malformed-marker refusal, and canonical managed-block parity.
- `npm run verify:skills` — passed all nine skills-prose/release checks.
- `npm run build` — core and MCP server builds passed on merged main.
- `npm run plugin:check` — passed: 30 tools match, committed bundle bytes match a fresh build, and all 12 skill frontmatters parse.
- `git diff --check` — passed; main worktree was clean after verification.

## Result

PASS. The merged setup skill directs missing AGENTS.md files to the existing user-owned template before the existing managed writer, reports required-section gaps in existing guides without rewriting human prose, and makes the no-file documentation debt idempotent through its stable source marker.
