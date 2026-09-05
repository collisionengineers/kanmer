# Post-implementation report — CORE-140

## Summary

`npm run verify` (and `npm run release`) used to build core + the MCP server
three times: once via `npm run build`, once inside `npm test` → `test:http`,
once inside `npm run mcpb:check` → `mcpb:build`. Each of those is now built
exactly once. `scripts/verify.mjs` writes a build stamp
(`dist/verify-stamp.json`, gitignored) immediately after the one root build,
and every later rail step that used to rebuild consumes an "already-built"
variant that asserts the stamp still matches — HEAD, dirty-tree digest,
`package-lock.json` hash, Node major, and every output's sha256 — and refuses
(exit 1, never rebuilds) on any mismatch. The public standalone commands
(`npm test`, `npm run test:http -w @kanmer/mcp-server`, `npm run mcpb:build`,
`npm run mcpb:check`) keep their original self-building behaviour unchanged.
`scripts/release.mjs` additionally refuses to package when the stamp reports
`dirty: true`. `pr.yml` moved both jobs to Node 24; `release.yml` and root
`engines` are untouched.

## Files changed

- `scripts/build-stamp.mjs` (new) — `writeStamp`, `readStamp`, `assertBuilt`,
  CLI `--write` / `--assert <id...>`. Every export takes an optional
  `{ root }` override (default: the real repo root) purely so
  `verify-steps.test.mjs` can exercise the refusal logic against a disposable
  temp git repo instead of this real one; the CLI always uses the real root.
- `packages/mcp-server/scripts/run-http-tests.mjs` (new) — owns the exact
  `test:http` `node --test` file list (unchanged); default behaviour builds
  then tests, `--assume-built` calls `assertBuilt(["server"])` instead.
- `scripts/run-tests.mjs` (new) — owns the `npm test` chain in the same
  order; `--assume-built` runs `test:http:built -w @kanmer/mcp-server`
  instead of `test:http`.
- `scripts/verify-steps.test.mjs` (new, auto-discovered by
  `scripts/test-scripts.mjs`) — (a) statically resolves every `VERIFY_STEPS`
  entry through root/workspace `package.json` scripts and asserts the root
  `build` script is reached exactly once, and that `test:built` /
  `mcpb:check:built` never re-invoke it; (b) unit-tests `build-stamp.mjs`'s
  refusal and pass cases in a disposable temp git repo (absent stamp, moved
  HEAD, dirtied tree, wrong Node major, wrong output hash, wrong lockHash,
  and a passing clean case).
- `scripts/verify.mjs` — `VERIFY_STEPS` gains `node scripts/build-stamp.mjs
  --write` right after `npm run build`; `npm test` → `npm run test:built`;
  `npm run mcpb:check` → `npm run mcpb:check:built`. The `KANMER_ROOT`
  temp-board env override now keys on `"npm run test:built"`.
- `scripts/release.mjs` — imports `readStamp`; after the `VERIFY_STEPS` loop,
  refuses (`refuse(...)`) when `readStamp()?.dirty` is true. No other change.
- `package.json` (root) — `test` → `node scripts/run-tests.mjs` (same
  behaviour as before); added `test:built`, `mcpb:build:built`
  (`build-stamp --assert server standalone && build-mcpb.mjs`),
  `mcpb:check:built`. `mcpb:build`/`mcpb:check` unchanged.
- `packages/mcp-server/package.json` — `test:http` → `node
  scripts/run-http-tests.mjs` (same behaviour); added `test:http:built`.
- `.github/workflows/pr.yml` — `node-version: 24` in both the `verify` and
  `kanmer-gate` jobs.
- `AGENTS.md` — §6 rows for `npm test`, `npm run verify`, `npm run
  mcpb:check` each gain a sentence describing the stamp and the internal
  `:built` variants (conduct rule 24).

Not touched (as required): `scripts/agents-block-body.mjs`, any `SKILL.md`,
`packages/mcp-server/src/reconciliation.ts`, `apps/gui/src/**`,
`.github/workflows/release.yml`, root `engines`,
`scripts/pr-workflow.test.mjs` (read first — it does not assert a
`node-version` value, so it needed no edit and still passes unmodified).

## Deviations from the plan

1. **`build-stamp.mjs` signatures gained an optional `{ root }` parameter**
   beyond the plan's plain `writeStamp()`/`readStamp()`/`assertBuilt(ids)`.
   The ticket itself asks for "unit-tests build-stamp refusal cases in a temp
   git repo," which is impossible if the module hardcodes the real repo root
   from its own `import.meta.url`. The CLI entry point and all real callers
   (`verify.mjs` indirectly via the `--write`/`--assert` CLI, `mcpb:build:built`,
   `run-http-tests.mjs`) still call the functions with no argument and get
   identical behaviour against the real repo root.
2. **Pre-existing gap found, not fixed**: a genuinely fresh `git clone` +
   `npm ci` followed directly by `npm run test:http -w @kanmer/mcp-server`
   (with no prior `npm run build`/`build:core`) fails on **both** unmodified
   `main` and this branch, with an identical esbuild error
   (`Could not resolve "@kanmer/core"` — `packages/mcp-server`'s own `build`
   script only runs `tsup`, it never builds `@kanmer/core` first, and nothing
   else builds it on `npm ci`). I verified this by cloning `main` at
   `c088be13` into a scratch directory and running the exact same command
   before touching anything — same failure, same stack. This is not a
   regression introduced by CORE-140; the "already-built" wiring here does
   not touch it (the public `test:http` path is unaffected by this ticket's
   `--assume-built` addition; it always ran `npm run build` in the mcp-server
   workspace, which never built core). Once `npm run build:core` (or `npm run
   build` at root) runs first, the fresh-clone command passes cleanly (242
   pass, 1 skipped) on this branch. `npm run mcpb:check` on a truly fresh
   clone passes without any extra step, because `mcpb:build` calls the root
   `npm run build`, which does build core. Flagging this for the reviewer /
   a follow-up ticket rather than silently fixing package ordering outside
   this ticket's declared technical seam.

## Commands run (scoped checks, per the ticket)

| Command | Result |
|---|---|
| `node --test scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs` | exit 0 — 10/10 pass |
| `npm run build && node scripts/build-stamp.mjs --write` | exit 0 |
| `npm run test:built` | exit 0 — 189/189 pass (includes `check:manual`, core+GUI vitest, `test:http:built -w @kanmer/mcp-server`, `test:scripts`) |
| `npm run mcpb:check:built` | exit 0 — mcpb built+validated without rebuilding the server |
| `node scripts/build-stamp.mjs --assert server standalone` (immediately after a build) | exit 0 — PASS |
| `echo "// x" >> packages/core/src/types.ts && node scripts/build-stamp.mjs --assert server standalone` | exit 1 — refuses with "working tree changed since the stamp was written (dirty digest mismatch)"; reverted with `git checkout -- packages/core/src/types.ts` |
| `npm run test:scripts` (full suite, not just the new file) | exit 0 — 189/189 pass, confirms no other `scripts/*.test.mjs` regressed |
| Fresh clone (`TMP` outside the repo, `C:\kanmer-tmp-core140`) `npm ci` | exit 0 |
| Fresh clone `npm run test:http -w @kanmer/mcp-server` (no prior build) | **fails identically on unmodified main** — pre-existing gap, see Deviation 2 |
| Fresh clone `npm run build:core && npm run test:http -w @kanmer/mcp-server` | exit 0 — 242 pass, 1 skipped |
| Fresh clone `npm run mcpb:check` | exit 0 — mcpb built, validated, 3 files, 1787936 bytes |

## Wall time observation (not a promise, per acceptance)

Measured locally (Windows, Node 24.15, warm npm cache): the root build
(`npm run build`, core + server together) completed in a few seconds (core
ESM ~0.2s + DTS ~5.3s; server ESM ~0.2s + standalone CJS ~0.5s). Before
CORE-140 this same build ran three times per `npm run verify`/`npm run
release` (directly, inside `test:http`, inside `mcpb:build`); after CORE-140
it runs once and the other two call sites assert instead. The saved wall
time locally is on the order of the build time itself (roughly 5-10s per
avoided rebuild); the acceptance criterion asks this be recorded as an
observation, and a full end-to-end `npm run verify` before/after timing was
not run locally per the operating rule that CI and Alex own the full rail —
CI's `verify` step on the PR will carry the real comparison for a Windows
runner, where cold TypeScript/tsup overhead is typically much larger than
observed here.

## Remaining obligations for the reviewer / CI

- The full `npm run verify` has intentionally not been run locally (repo
  operating rule: implementers run scoped checks, CI/Alex own the full
  rail). CI on this PR is the first full-rail run of the new `:built` wiring
  end to end.
- Deviation 2 above (pre-existing `test:http` fresh-clone build-ordering gap)
  is unrelated to this ticket's scope but worth a follow-up ticket; it was
  not introduced or fixed here.
- `release.mjs`'s new dirty-stamp refusal has not been exercised via an
  actual `npm run release -- ... --dry-run` invocation (that command has
  wider preconditions — clean main, a real ticket, etc. — out of scope for a
  worktree branch); the refusal logic itself is unit-tested in
  `verify-steps.test.mjs` via `assertBuilt`'s underlying dirty-digest checks,
  and `readStamp()`/the `dirty` field are exercised directly by the temp-repo
  tests. Reviewer should confirm the `release.mjs` refusal reads correctly at
  the diff level, since it isn't independently exercised end-to-end.
