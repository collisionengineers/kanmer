---
id: CORE-145
type: ticket
title: >-
  packages/mcp-server's build never builds @kanmer/core, so a fresh clone fails
  npm run test:http
status: done
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-05T04:12:13.725Z'
  review: '2026-09-05T04:21:49.616Z'
  verifying: '2026-09-05T13:38:33.315Z'
  done: '2026-09-05T13:49:25.398Z'
labels:
  - rail
  - build
  - follow-up
groups:
  - HZN-009
links:
  - CORE-140
docs_todo: true
commits:
  - a3742f79
  - ce4587af
  - 3ebb7123
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/328'
delivery_state: integrated
delivery_branch: main
delivery_sha: 58718455ffc2174e2cc34cccf72d5f0158fc876b
delivery_recorded_at: '2026-09-05T13:49:33.899Z'
archived: false
created: '2026-09-05T03:03:02.310Z'
updated: '2026-09-05T13:51:09.602Z'
---

Filed by the independent review of CORE-140 (PR #322). **Pre-existing on `main` at `c088be1391a1198c914fc3ef247103fd52c277c5`; not introduced by CORE-140.**

`packages/mcp-server/package.json`'s `build` is `tsup && tsup --config tsup.standalone.config.ts` — it never builds `@kanmer/core` first, and nothing else does so on `npm ci`. So on a genuinely fresh `git clone` + `npm ci`, running `npm run test:http -w @kanmer/mcp-server` directly (with no prior root `npm run build` / `npm run build:core`) fails in esbuild with `Could not resolve "@kanmer/core"`, because the workspace symlink points at `packages/core/dist/index.js`, which does not exist yet.

Confirmed independently at review time by reading the script (the mechanism is unambiguous); the CORE-140 implementer additionally reproduced it against an unmodified clone of `main` at `c088be13` before touching anything, and again on the CORE-140 branch — identical failure both sides.

`npm run mcpb:check` is unaffected on a fresh clone, because `mcpb:build` calls the *root* `npm run build`, which does build core.

## Suggested remedy

Either make `packages/mcp-server`'s `build` depend on `@kanmer/core`'s build (e.g. `npm run build -w @kanmer/core && tsup && …`, or a `prebuild`), or document that `npm run build:core` is a prerequisite of the standalone workspace test command. Pick one; do not do both.

## Note

AGENTS.md §6 currently documents `npm test` as building `@kanmer/mcp-server` itself before testing it, which is true but incomplete for a cold checkout. Whatever remedy is chosen should leave §6 accurate (conduct rule 24).

## Outcome

Shipped: `packages/mcp-server/scripts/run-http-tests.mjs`'s non-assume-built (default) branch now checks `existsSync(packages/core/dist/index.js)` before its existing build call and runs `npm run build:core` at the repo root first only when that file is missing; the rail's `--assume-built` branch is untouched. AGENTS.md §6 updated to document the cold-checkout core build. Merged via PR #328 (squash commit `58718455ffc2174e2cc34cccf72d5f0158fc876b`) on 2026-09-05. Verified PASS: fresh-clone `npm run test:http -w @kanmer/mcp-server` with no prior build (248/249 pass, 1 skip), `verify-steps.test.mjs` 12/12, `test:scripts` 196/196 (after a root build), and the hosted `pr.yml` `verify` job green at the exact merge SHA (run 33969450026). No follow-up ticket required; the ticket's own suggested remedy was implemented as designed, conflict-resolved against sibling PR #327 (CORE-144) per the coordinator's explicit instructions recorded in the post-implementation report.
