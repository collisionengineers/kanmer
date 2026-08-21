# Post-implementation report — MCP-025

## Delivered

- Extracted one canonical `createKanmerMcpServer(policy)` registry; `local-stdio` preserves the full local surface and `remote-http-v1` owns the remote exclusion policy.
- Added a loopback-only native Node `/mcp` host over the pinned MCP SDK 1.30.0 stateful `StreamableHTTPServerTransport`.
- Added fail-closed injected authorization, strict origin/method/path/size/config preflight, bounded connection/request/keep-alive/session/in-flight/TTL/shutdown controls, opaque principal-bound sessions, expiry/disconnect/DELETE/invalidation cleanup, and idempotent bounded shutdown.
- Added readiness/stopped metadata without tokens, full session ids, document content, or arbitrary request data; HTTP CLI exits before binding without a production authorizer.
- Fixed per-session MCP server identity/capability isolation (MCP-031) and restored self-contained ESM stdio identity/bundled-skill discovery (MCP-032).
- Refreshed the canonical plugin bundle because the shared project-fingerprint helper legitimately changes the stdio artifact.

## Scope boundaries

MCP-025 does not parse, store, compare, generate, rotate, or log bearer tokens; MCP-026 owns that injected authorizer. It adds no tunnel, GUI setting, public bind, remote dispatch, or project selection from request data.

## Evidence

- `npm run test:http -w @kanmer/mcp-server` — 5/5 tests pass, including official SDK client parity against stdio/remote tool names and schemas.
- `npm run build:server` — ESM and standalone builds pass.
- `node packages/mcp-server/src/smoke-http.mjs` — pass.
- `node packages/mcp-server/src/smoke.mjs` — 175/175.
- `node packages/mcp-server/src/smoke-protocol.mjs` — 30/30.
- `node packages/mcp-server/src/smoke-discovery.mjs` — 13/13.
- `npm test` — manual check, core 255/255, GUI suite, HTTP rail, and scripts pass.
- `npm run typecheck` — exit 0 across core, MCP, UI, and GUI.
- `git diff --check` — pass.
- `npm run verify` — unavailable on this base (npm reports missing script); no result is claimed.
- Windows PR verification — this Windows checkout ran the same PowerShell/Node command rail; hosted PR CI remains external evidence.
- Plugin bytes — regenerated in the ticket worktree from the legitimate shared-source change; normal-main `plugin:check` is reserved for merged-main verification because linked worktrees are intentionally refused.

## Requirement coverage

The 121-point checklist is complete. Readiness includes PID/host/port/endpoint/project fingerprint/mode/auth-required/supported protocol versions; tests cover Origin ordering, malformed/unknown/expired/cross-principal/restarted sessions, duplicate/concurrent initialization, limits, fake-clock and real-TTL expiry, disconnect/cancellation cleanup, DELETE/invalidation/shutdown, safe read/project identity, and remote/local tool-set equality. No public listener or tunnel is created.

## Handoff

MCP-026 supplies the real bearer authorizer before any tunnel exposure. MCP-021 owns tunnel lifecycle. MCP-027, GUI-095, DOC-013, and MCP-028 remain downstream milestone work.
