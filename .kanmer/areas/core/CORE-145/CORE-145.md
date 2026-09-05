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
taken_at: '2026-09-05T04:12:51.989Z'
branch: CORE-145-mcp-server-build-core
worktree: .worktrees/CORE-145
claim_expires_at: '2026-09-05T04:42:51.989Z'
claim_controller: claude-code
lease_id: 1bf29689-d126-46e6-8ac6-a066ef0ce33a
lease_revision: 1
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-145'
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T04:12:51.989Z'
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
updated: '2026-09-05T13:49:33.899Z'
---

Filed by the independent review of CORE-140 (PR #322). **Pre-existing on `main` at `c088be1391a1198c914fc3ef247103fd52c277c5`; not introduced by CORE-140.**

`packages/mcp-server/package.json`'s `build` is `tsup && tsup --config tsup.standalone.config.ts` — it never builds `@kanmer/core` first, and nothing else does so on `npm ci`. So on a genuinely fresh `git clone` + `npm ci`, running `npm run test:http -w @kanmer/mcp-server` directly (with no prior root `npm run build` / `npm run build:core`) fails in esbuild with `Could not resolve "@kanmer/core"`, because the workspace symlink points at `packages/core/dist/index.js`, which does not exist yet.

Confirmed independently at review time by reading the script (the mechanism is unambiguous); the CORE-140 implementer additionally reproduced it against an unmodified clone of `main` at `c088be13` before touching anything, and again on the CORE-140 branch — identical failure both sides.

`npm run mcpb:check` is unaffected on a fresh clone, because `mcpb:build` calls the *root* `npm run build`, which does build core.

## Suggested remedy

Either make `packages/mcp-server`'s `build` depend on `@kanmer/core`'s build (e.g. `npm run build -w @kanmer/core && tsup && …`, or a `prebuild`), or document that `npm run build:core` is a prerequisite of the standalone workspace test command. Pick one; do not do both.

## Note

AGENTS.md §6 currently documents `npm test` as building `@kanmer/mcp-server` itself before testing it, which is true but incomplete for a cold checkout. Whatever remedy is chosen should leave §6 accurate (conduct rule 24).
