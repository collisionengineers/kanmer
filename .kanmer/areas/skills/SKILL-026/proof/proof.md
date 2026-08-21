# Proof — SKILL-026: AGENTS.md ownership integration verification

## Merged result

Verified on current merged `main` at `a34f087d9d8d0d33a78fda1238cbf53f3f907d7d` (PR [#99](https://github.com/collisionengineers/kanmer/pull/99), merged 2026-08-21T01:19:13Z).

## Evidence

- `npm test -w @kanmer/gui -- --run src/main/repoStaleness.test.ts` — **2/2 passed**. The added disposable scenario materialises the canonical user-owned skeleton, calls the actual writer, proves `## Agent conduct` and all five required headings, confirms a second invocation is byte-identical, detects an in-block tamper as `agents-block: behind`, and removes only the managed span with the production GUI helper.
- `npm test -w @kanmer/core -- staleness.test.ts` — **40 tests passed**.
- `node --test scripts/verify-skill-prose.test.mjs` — **5/5 passed**, including the template contract and rejection of exact marker sentinels.
- `npm run verify:agents-block` — **31/31 passed**.
- `npm run verify:skills` — passed.
- `npm run typecheck -w @kanmer/gui` — passed.
- `git diff --check` — passed on merged main.

## Result

PASS. The documented no-file setup path no longer self-identifies the canonical template as malformed; a disposable repo receives the canonical managed conduct block plus user-owned skeleton, detects body drift by the ADR-0015 content-based route, remains idempotent, and removes only Kanmer-owned marker content.
