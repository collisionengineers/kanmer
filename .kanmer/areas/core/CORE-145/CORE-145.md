---
id: CORE-145
type: ticket
title: >-
  packages/mcp-server's build never builds @kanmer/core, so a fresh clone fails
  npm run test:http
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - rail
  - build
  - follow-up
groups:
  - HZN-009
links:
  - CORE-140
docs_todo: true
archived: false
created: '2026-09-05T03:03:02.310Z'
updated: '2026-09-05T03:03:02.310Z'
---

Filed by the independent review of CORE-140 (PR #322). **Pre-existing on `main` at `c088be1391a1198c914fc3ef247103fd52c277c5`; not introduced by CORE-140.**

`packages/mcp-server/package.json`'s `build` is `tsup && tsup --config tsup.standalone.config.ts` — it never builds `@kanmer/core` first, and nothing else does so on `npm ci`. So on a genuinely fresh `git clone` + `npm ci`, running `npm run test:http -w @kanmer/mcp-server` directly (with no prior root `npm run build` / `npm run build:core`) fails in esbuild with `Could not resolve "@kanmer/core"`, because the workspace symlink points at `packages/core/dist/index.js`, which does not exist yet.

Confirmed independently at review time by reading the script (the mechanism is unambiguous); the CORE-140 implementer additionally reproduced it against an unmodified clone of `main` at `c088be13` before touching anything, and again on the CORE-140 branch — identical failure both sides.

`npm run mcpb:check` is unaffected on a fresh clone, because `mcpb:build` calls the *root* `npm run build`, which does build core.

## Suggested remedy

Either make `packages/mcp-server`'s `build` depend on `@kanmer/core`'s build (e.g. `npm run build -w @kanmer/core && tsup && …`, or a `prebuild`), or document that `npm run build:core` is a prerequisite of the standalone workspace test command. Pick one; do not do both.

## Note

AGENTS.md §6 currently documents `npm test` as building `@kanmer/mcp-server` itself before testing it, which is true but incomplete for a cold checkout. Whatever remedy is chosen should leave §6 accurate (conduct rule 24).
