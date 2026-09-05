# Post-implementation report — CORE-145

Branch `CORE-145-mcp-server-build-core`, worktree `.worktrees/CORE-145`, base
`main` at `e474f317` (MCP-057, the `main` tip when this branch was cut — the
board's own git remote had fast-forwarded past DOC-026 between CORE-144 and
this ticket). Commits `a3742f79` (fix) and `ce4587af` (AGENTS.md §6), merged
with `main` at `3ebb7123` (see Merge resolution below) after CORE-144 (#327)
landed on `main` at `de5bace9`.

## What changed

- `packages/mcp-server/scripts/run-http-tests.mjs` — the non-assume-built
  (default) branch now checks `existsSync(packages/core/dist/index.js)`
  before its existing `npm run build` call and, only when that file is
  missing, first runs `npm run build:core` at the repo root. The rail's
  `--assume-built` branch (`assertBuilt(["server"])`) is untouched.
- `AGENTS.md` §6 — `npm test` row now notes the cold-checkout core build.

## Why this fix location, not `packages/mcp-server/package.json`'s `build`

Root `npm run build` is `npm run build -w @kanmer/core && npm run build -w
@kanmer/mcp-server`. If `@kanmer/mcp-server`'s own `build` script instead
depended on core (e.g. `npm run build -w @kanmer/core && tsup && ...`), the
root build would build core twice — once directly, once via the nested
mcp-server build — which is exactly the class of duplicate CORE-140 exists to
prevent. Fixing it in the runner script's non-assume-built branch only
affects the direct `npm run test:http -w @kanmer/mcp-server` / public `npm
test` path; the rail never takes that branch, so `VERIFY_STEPS`'
build-once invariant is unaffected.

## Reproduced the bug before fixing

In this worktree, before the fix: `npm run test:http -w @kanmer/mcp-server`
with no `packages/core/dist` present failed exactly as the ticket describes
— `esbuild: Could not resolve "@kanmer/core"` inside
`packages/mcp-server`'s own `npm run build`.

## Merge resolution (CORE-144 landed on main as PR #327, de5bace9)

CORE-144 (PR #327) merged to `main` while this ticket was in review and
conflicted with this branch in
`packages/mcp-server/scripts/run-http-tests.mjs`'s non-assume-built `else`
branch: #327 replaced the bare `execFileSync("npm", ["run","build"], {cwd:
packageRoot})` line with a `for (const command of COMMANDS.default)
runNpmCommand(command)` loop reading `COMMANDS` (exported as pure data for
`scripts/verify-steps.test.mjs`'s resolver); this branch had inserted the
`existsSync(coreDistIndex)` guard immediately above that same line.

Resolved per the coordinator's instruction, confirmed correct against
CORE-144's own guard-fidelity design: kept the `existsSync`-guarded
`npm run build:core` call as **imperative code inside the `else` branch,
before** the `COMMANDS.default` loop, using the runner's own `runNpmCommand`
helper — and did **not** add it to `COMMANDS.default`. `COMMANDS.default` is
read by `scripts/verify-steps.test.mjs`'s "every workspace's build script
reached at most once" assertion as an *unconditional* command list; declaring
a conditional build there would misrepresent the guard's own data source.
Kept CORE-144's entry-point guard (`if (process.argv[1] &&
fileURLToPath(import.meta.url) === resolve(process.argv[1]))`) and both
`COMMANDS` exports intact. Added a short in-file comment explaining why the
core-dist guard is deliberately not part of `COMMANDS.default`.

`git merge origin/main` (`de5bace9`) auto-merged every other file (AGENTS.md,
`.github/workflows/pr.yml`, `scripts/build-stamp.mjs`,
`scripts/verify-steps.test.mjs`, `scripts/run-tests.mjs`,
`packages/mcp-server/src/check-pr.mjs`/`.test.mjs`,
`scripts/pr-workflow.test.mjs`, two skill files) with no further conflicts.
Merge commit `3ebb7123`. `scratch/review.md` was not touched.

## Commands run

### Before the merge (original implementation)

| Command | Where | Result |
|---|---|---|
| `npm ci` | `.worktrees/CORE-145` | exit 0 |
| `npm run test:http -w @kanmer/mcp-server` (before fix, no prior build) | `.worktrees/CORE-145` | failed — reproduces the ticket exactly |
| `npm run test:http -w @kanmer/mcp-server` (after fix, dists removed first) | `.worktrees/CORE-145` | exit 0, 245 pass / 1 skipped |
| `git clone .worktrees/CORE-145 $TMP/kanmer-fresh-145 && npm ci && npm run test:http -w @kanmer/mcp-server` | fresh clone | exit 0, 245 pass / 1 skipped |
| `node --test scripts/verify-steps.test.mjs` | `.worktrees/CORE-145` | exit 0, 9/9 pass (pre-CORE-144 test set — expected, independent branch) |
| `npm run build` | `.worktrees/CORE-145` | exit 0 |
| `npm run test:scripts` | `.worktrees/CORE-145` | exit 0, 193/193 pass |
| `npm run verify:docs` | `.worktrees/CORE-145` | PASS (22 chapters) |
| `npm run verify:agents-block` | `.worktrees/CORE-145` | 35/35 checks passed |

### After merging origin/main (`de5bace9` → merge commit `3ebb7123`)

| Command | Where | Result |
|---|---|---|
| `npm ci` | `.worktrees/CORE-145` | exit 0 |
| `node --test scripts/verify-steps.test.mjs` | `.worktrees/CORE-145` | exit 0, **12/12** pass — now includes CORE-144's "every workspace's build script reached at most once" assertion and its mutation regression test, both green with the imperative core-dist guard sitting outside `COMMANDS.default` |
| `npm run build` | `.worktrees/CORE-145` | exit 0 |
| `npm run test:scripts` | `.worktrees/CORE-145` | exit 0, 196/196 pass |
| `git clone .worktrees/CORE-145 $TMP/kanmer-fresh-145b && npm ci && npm run test:http -w @kanmer/mcp-server` | fresh clone, outside the repo, no prior build anywhere | exit 0, 248 pass / 1 skipped |
| `npm run verify:docs` | `.worktrees/CORE-145` | PASS (22 chapters) |
| `npm run verify:agents-block` | `.worktrees/CORE-145` | 35/35 checks passed |
| `git status --porcelain=v1` (excl. `dist/`) | `.worktrees/CORE-145` | clean after the merge commit |

Did not run `npm run verify` (scoped checks only, per policy). CI runs the
full rail on the PR. Did not merge the PR, did not self-review, did not touch
`scratch/review.md`.

## Deviations / notes

- The ticket's two branches based their diff on the same `main` commit
  (`c088be13`); by the time this ticket's worktree was cut, the board's local
  `main` had fast-forwarded to `e474f317` (MCP-057 merged after CORE-144's
  base). Both CORE-144 and CORE-145 were independent single-purpose diffs
  against `main`; CORE-144 landed first and this branch merged it in per the
  coordinator's explicit resolution instructions above.
- `mcpb:build` / `mcpb:check` and the root `npm run build` were not touched
  and remain exactly as documented — they were never affected by this bug
  (confirmed by ticket and unchanged by this diff).
