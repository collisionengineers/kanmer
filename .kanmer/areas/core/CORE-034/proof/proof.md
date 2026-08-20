# Proof — CORE-034

## Merged target

- Verified from the normal source checkout on `main`, commit `e87117cda3947ed2a28871f8f77e8090f84e1d4d`.
- PR [#82](https://github.com/collisionengineers/kanmer/pull/82) is `MERGED` (2026-08-20T22:29:03Z).

## Verification evidence

| Command | Result |
|---|---|
| `npm test --workspace @kanmer/core -- --run src/store.test.ts` | PASS — 81/81. Covers board-worktree relative, absolute, canonical, mixed-separator, trailing-separator, Windows-casing and no-write rejection cases, plus valid sibling/no-worktree takes. |
| `npm test --workspace @kanmer/gui -- --run src/main/kanmerGit.test.ts --testNamePattern inspectBoardWorktree --maxWorkers=1 --minWorkers=1` | PASS — 4/4 focused observer cases; 7 unrelated tests skipped. |
| `npm run typecheck --workspace @kanmer/core; npm run typecheck --workspace @kanmer/mcp-server; npm run typecheck --workspace @kanmer/gui` | PASS — all changed workspaces. |
| `npm run build` then `node packages/mcp-server/src/smoke.mjs` | PASS — 163/163. Verifies the seven-field informational `boardWorktree` block, default `kanmer-board`, unavailable Git data path, healthy branch observation, and active-ticket count. |
| `KANMER_BOARD_BRANCH=team-board node packages/mcp-server/src/smoke.mjs` | PASS — 163/163, including override branch observation. |
| `npm run plugin:build && npm run plugin:check && git diff --check && git status --short` from this normal checkout | PASS — 30 tools match, plugin bundle bytes match, 12 skill frontmatters parse; no diff-check or worktree-status output. |

## Scope checks

- The core guard remains pure path comparison; Git branch inspection is confined to paired MCP/GUI observers and is non-blocking.
- `npm run typecheck` was also run. It still fails only in unchanged `@kanmer/ui/src/demo.tsx`: its `getTicketDocsInfo` stub omits required `documentPaths`. This is the pre-existing, documented unrelated failure; core, MCP server, and GUI typechecks above pass.

No regression was observed on merged main.
