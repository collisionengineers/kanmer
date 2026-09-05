# Post-implementation report — CORE-145

Branch `CORE-145-mcp-server-build-core`, worktree `.worktrees/CORE-145`, base
`main` at `e474f317` (MCP-057, the `main` tip when this branch was cut — the
board's own git remote had fast-forwarded past DOC-026 between CORE-144 and
this ticket). Commits `a3742f79` (fix) and `ce4587af` (AGENTS.md §6).

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

## Commands run

| Command | Where | Result |
|---|---|---|
| `npm ci` | `.worktrees/CORE-145` | exit 0 |
| `npm run test:http -w @kanmer/mcp-server` (before fix, no prior build) | `.worktrees/CORE-145` | failed — reproduces the ticket exactly |
| `npm run test:http -w @kanmer/mcp-server` (after fix, `packages/mcp-server/dist` and `packages/core/dist` removed first) | `.worktrees/CORE-145` | exit 0, 245 pass / 1 skipped |
| `git clone .worktrees/CORE-145 $TMP/kanmer-fresh-145 && npm ci && npm run test:http -w @kanmer/mcp-server` | fresh clone, outside the repo | exit 0, 245 pass / 1 skipped — no prior root build, no prior `build:core`, nothing in the environment but the commit and `npm ci` |
| `node --test scripts/verify-steps.test.mjs` | `.worktrees/CORE-145` | exit 0, 9/9 pass (this worktree is on plain `main`, pre-CORE-144, so it does not yet have CORE-144's extra assertions/tests — expected, since these are independent branches off the same `main`) |
| `npm run build` | `.worktrees/CORE-145` | exit 0 |
| `npm run test:scripts` | `.worktrees/CORE-145` | exit 0, 193/193 pass |
| `npm run verify:docs` | `.worktrees/CORE-145` | PASS (manual up to date, 22 chapters) |
| `npm run verify:agents-block` | `.worktrees/CORE-145` | 35/35 checks passed |
| `git status --porcelain=v1` (excl. `dist/`) | `.worktrees/CORE-145` | clean after both commits |

Did not run `npm run verify` (scoped checks only, per policy). CI runs the
full rail on the PR.

## Deviations / notes

- The ticket's two branches based their diff on the same `main` commit
  (`c088be13`); by the time this ticket's worktree was cut, the board's local
  `main` had fast-forwarded to `e474f317` (MCP-057 merged after CORE-144's
  base). Both CORE-144 and CORE-145 are independent single-purpose diffs
  against `main` and do not depend on each other's branch; each PR will pick
  up the other's changes only once merged and rebased/updated by the reviewer
  or CI, as is normal for two parallel follow-ups off the same base.
- `mcpb:build` / `mcpb:check` and the root `npm run build` were not touched
  and remain exactly as documented — they were never affected by this bug
  (confirmed by ticket and unchanged by this diff).
