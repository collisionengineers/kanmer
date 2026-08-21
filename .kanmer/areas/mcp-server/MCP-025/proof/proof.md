# Proof — MCP-025

## Verified merge

- PR: #90
- Merged commit verified from the main checkout: `a05fd9eddce8c23c50153bf56d83b56ea469615b`.
- Main was fast-forwarded to `origin/main` before every command below. No feature-branch result was used as proof.

## Passed evidence

| Command | Result |
|---|---|
| `npm run typecheck -w @kanmer/mcp-server` | Pass. |
| `npm test` | Pass: manual check current; core 255/255; GUI 300/300; scripts 55/55. |
| `npm run build` | Pass: core and MCP server ESM/standalone builds completed. |
| `node packages/mcp-server/src/smoke.mjs` | Pass: **175/175**. Confirms normal stdio tool surface, protocol purity, root handling, and `get_status` reports the spawned `dist/index.js` path/hash/size/build plus bundled-skill managed-block staleness discovery. |
| `node packages/mcp-server/src/smoke-http.mjs` | Pass. Starts a disposable loopback host, enforces fail-closed authorizer/bind/routing behavior, and keeps two independently negotiated sessions live. Session B advertises elicitation; after B initializes, Session A's create mutation remains attributed to `http-smoke` and Session A's destructive call keeps A's no-elicitation context. |
| `npm run smoke:protocol` | Pass: **30/30** across supported protocol versions, including request `_meta` identity precedence. |
| `npm run smoke:discovery` | Pass: **13/13** across board-worktree and no-board discovery paths. |
| `git diff --check` and `git status --short` | Pass; no source-worktree changes or smoke debris. |

## Scope and safety confirmation

- The normal stdio identity/staleness regression fixed by `987fe05` is verified on merged main, not inferred from the PR branch.
- The MCP-031 per-session isolation regression is exercised by the built HTTP smoke above.
- Production HTTP remains loopback-only and fails closed without an injected authorizer.
- No MCP-026 bearer parsing, token storage/comparison/generation/rotation, tunnel, GUI exposure, or persistent session behavior is present in this verification.

## Repository-wide typecheck note

`npm run typecheck` remains non-green outside MCP-025 scope because existing UI/GUI errors report `TicketDocsInfo.scratch` missing in `apps/gui/src/renderer/src/components/Editor.tsx` and an incomplete `documentPaths` mock in `packages/ui/src/demo.tsx`. The MCP server workspace typecheck passes, all repository runtime tests pass, and the merged transport evidence above is green. This proof does not represent the unrelated UI errors as a pass.
