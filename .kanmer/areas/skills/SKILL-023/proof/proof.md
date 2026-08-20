# Proof — SKILL-023

PR [#77](https://github.com/collisionengineers/kanmer/pull/77) merged to `main` as `6cebc07e246183a1b195916da3c602149233b4b7`.

Merged-main verification:

- `npm run verify:agents-block` — 31/31 passed.
- `npm test -w @kanmer/core -- staleness.test.ts` — 40 passed.
- `npm run verify:skills` — all nine checks passed.
- `npm run build`, `npm run plugin:check` — plugin bundle byte match with 30 tools.
- `node packages/mcp-server/src/smoke.mjs` — 159/159 passed.
- `git diff --check` — clean.
