# Post-implementation report — MCP-036

## Delivered

- `KanmerHttpHost.start()` resolves the canonical project fingerprint before calling `httpServer.listen()`.
- Readiness reuses that immutable fingerprint, so startup performs one project resolution and cannot expose a listener for an invalid/no-board root.
- Listener errors and address failures roll back the sweep timer and any sockets/listener resources before rethrowing the original error.
- Added a child-process regression that runs with no discovered board, proves startup reports the canonical no-board error, exits cleanly within the timeout, and never emits a ready event.

## Evidence

- `npm run test:http -w @kanmer/mcp-server` — 7/7 pass.
- `node packages/mcp-server/src/smoke-http.mjs` — pass.
- `node packages/mcp-server/src/smoke.mjs` — 184/184.
- `node packages/mcp-server/src/smoke-protocol.mjs` — 42/42.
- `node packages/mcp-server/src/smoke-discovery.mjs` — 13/13.
- `npm run typecheck` — exit 0 across all workspaces.
- `git diff --check` — pass.
- No bearer, tunnel, GUI, tool-surface, or unrelated lifecycle behavior changed.

## Scope and handoff

This commit is based on the MCP-025 PR branch so the fix can be independently reviewed and merged into that transport change before PR #107 reaches main. MCP-036 does not merge or move MCP-025; its proof will be finalized after the combined change reaches merged main.
