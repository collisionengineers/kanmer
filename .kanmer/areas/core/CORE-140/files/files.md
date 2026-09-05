## Files touched

- `scripts/build-stamp.mjs` (new) — `writeStamp()`, `readStamp()`, `assertBuilt(ids)`, CLI `--write` / `--assert <ids...>`. Writes/reads `dist/verify-stamp.json`.
- `packages/mcp-server/scripts/run-http-tests.mjs` (new) — owns the `test:http` `node --test` file list; `--assume-built` skips the build via `assertBuilt(["server"])`.
- `scripts/run-tests.mjs` (new) — owns the root `npm test` chain; `--assume-built` runs `test:http:built` instead of `test:http`.
- `scripts/verify-steps.test.mjs` (new) — statically resolves every `VERIFY_STEPS` entry through root/workspace `package.json` scripts, asserts root `build` appears exactly once; unit-tests `build-stamp.mjs` refusal/pass cases in a temp git repo.
- `scripts/verify.mjs` — insert `node scripts/build-stamp.mjs --write` after `npm run build`, swap `npm test`/`npm run mcpb:check` for the `:built` variants, update the `KANMER_ROOT` step-name comparison.
- `scripts/release.mjs` — after the `VERIFY_STEPS` loop, `readStamp()` and refuse when `dirty === true`.
- `package.json` (root) — `test` → `node scripts/run-tests.mjs`; add `test:built`, `mcpb:build:built`, `mcpb:check:built`. Public `test`, `mcpb:build`, `mcpb:check` unchanged behaviour.
- `packages/mcp-server/package.json` — `test:http` → `node scripts/run-http-tests.mjs`; add `test:http:built`.
- `.github/workflows/pr.yml` — `node-version: 24` in both jobs (`verify`, `kanmer-gate`).
- `scripts/pr-workflow.test.mjs` — update only if it asserts anything the Node bump affects (expected: no change needed, it does not assert node-version).
- `AGENTS.md` — §6 rows for `npm test`, `npm run verify`, `mcpb:check` get a sentence about the stamp and the `:built` variants.

## Not touched

`scripts/agents-block-body.mjs`, any `SKILL.md`, `packages/mcp-server/src/reconciliation.ts`, `apps/gui/src/**`, `.github/workflows/release.yml`, root `engines`.
