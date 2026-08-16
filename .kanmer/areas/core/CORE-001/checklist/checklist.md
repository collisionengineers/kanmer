# Checklist

## Core

- [x] `paths.ts`: export `WORKTREES_DIR`
- [x] `paths.ts`: `deriveRepoRoot(boardRoot)` — matches only `<x>/.worktrees/<name>`, else null
- [x] `paths.ts`: `resolvePaths(projectRoot, repoRoot?)` exposes `repoRoot`
- [x] `store.ts`: constructor accepts `opts.repoRoot`
- [x] `store.ts`: `assertRefs` validates against `paths.repoRoot` and names it in the error

## MCP server

- [x] `root.ts`: `resolveRepoRoot` — `--repo-root` → `KANMER_REPO_ROOT` → undefined
- [x] `root.ts`: shared `readFlag` helper; `resolveProjectRoot` behaviour unchanged
- [x] `index.ts`: pass `repoRoot` into the store

## GUI

- [x] `main/index.ts`: `new KanmerStore(boardRoot, { repoRoot: projectId })`
- [x] `main/connect.ts`: `serverInvocation(boardRoot, sourceRoot)` emits `--repo-root` only when they differ
- [x] `main/connect.ts`: `connectAgent`'s `boardRoot` required (latent trap removed)
- [x] `main/dispatch.ts`: `sourceRoot` required (latent trap removed)
- [x] Rename the shadowing local `repoRoot` in `serverInvocation` to `installRoot` — it meant the Kanmer install, not the project

## Tests

- [x] core: derived repoRoot accepts a ref that exists in the repo but not under the board root
- [x] core: the leave-backlog gate actually opens on that ref
- [x] core: explicit `repoRoot` honoured; ghost ref still rejected
- [x] core: colocated board falls back to `projectRoot`
- [x] gui: four `dispatchTicket` call sites updated for the required argument

## Verification

- [x] `npm test` — 109 core (+3) / 95 GUI
- [x] `npm run typecheck -w @kanmer/gui`
- [x] `npm run build && npm run plugin:build && npm run plugin:check` — 24 tools, bundle bytes match
- [x] `node packages/mcp-server/src/smoke.mjs` — 85/85
- [x] `npm run smoke:protocol` — 26/26
- [x] Live proof on this repo's board: the failing `refs` call now succeeds
