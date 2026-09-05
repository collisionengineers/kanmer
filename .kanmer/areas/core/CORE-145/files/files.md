# Files touched (CORE-145)

- `packages/mcp-server/scripts/run-http-tests.mjs` — in the non-assume-built
  (default) branch, run `npm run build:core` at the repo root first when
  `packages/core/dist/index.js` is missing, then the existing workspace build.
  Leaves the `--assume-built` (rail) branch untouched.
- `AGENTS.md` §6 — `npm test` row: note that a cold checkout's `test:http`
  path also builds `@kanmer/core` first when its `dist/index.js` is missing
  (conduct rule 24 — keep the command contract accurate).

Not touched: `packages/mcp-server/package.json`'s `build` script (kept as
`tsup && tsup --config tsup.standalone.config.ts` — unchanged, so
`mcpb:build`/root `npm run build` still build core exactly once each, per
CORE-140's build-once contract); `scripts/verify.mjs` / `VERIFY_STEPS`
(unaffected — the rail always uses the `--assume-built` branch, which never
reaches this new code path).
