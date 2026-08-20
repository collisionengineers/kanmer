# Files — MCP-025

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/index.ts` | Preserve the existing stdio entry contract while extracting/reusing a shared MCP server/tool-registry factory. It must remain the provider/plugin default command. |
| `packages/mcp-server/src/server.ts` | Add or extend the shared `createKanmerMcpServer`/tool-registration composition with explicit exposure policy. Keep store/root/error/tool definitions single-sourced. If an equivalent canonical module already exists, modify it instead of adding this path. |
| `packages/mcp-server/package.json` | Add the internal/experimental HTTP host bin/export and required scripts using the pinned SDK/runtime. Preserve existing stdio bin/exports. Add no framework dependency without documented SDK/API need. |
| `packages/mcp-server/src/smoke-discovery.mjs` | Assert local stdio tool discovery unchanged and remote policy equals local minus the exact excluded dispatch set. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Preserve stdio protocol regression and add/reuse HTTP client protocol assertions where this remains the canonical smoke. |
| `package.json` | Wire canonical HTTP tests/smoke into existing test/verify rail once. Do not add a disconnected command. |
| `scripts/verify.mjs` | Ensure transport tests, stdio smokes, and plugin check are reached once. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate only through the canonical main-checkout `plugin:build` if shared factory refactoring changes shipped stdio bundle bytes. Never hand-edit. |
| `docs/functional/frd/FRD-025-remote-access.md` | Consume/link accepted transport requirements; modify only through the approved documentation follow-up if implementation reveals a discrepancy. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Consume/link accepted architecture; do not silently diverge. |

## Add

| Path | Purpose |
|---|---|
| `packages/mcp-server/src/http.ts` | Streamable HTTP host composition: validated loopback config, required authorizer interface, origin/host hook, official SDK transport adaptation, `/mcp` method routing, one-project context, limits, session registry integration, ready/status events, graceful shutdown. |
| `packages/mcp-server/src/http-cli.mjs` | Internal/experimental process entry: parse validated local-only config, resolve one project, require auth provider, start host, emit machine-readable readiness, handle signals. It must not expose an unauthenticated public mode. |
| `packages/mcp-server/src/http-session-registry.ts` | In-memory bounded session lifecycle/principal binding/TTL/cleanup abstraction when not already provided cleanly by the SDK host adapter. Keep protocol framing in SDK. |
| `packages/mcp-server/src/http-config.ts` | Typed defaults/validation for host, port, path, timeouts, body/session/concurrency limits and origin allowlist. Add only if keeping this inside `http.ts` would make tests/config ownership ambiguous. |
| `packages/mcp-server/src/http.test.ts` | Unit/integration tests with loopback port 0, injectable authorizer/clock, disposable board, raw HTTP and official MCP client cases. Use the repository's existing test naming/location convention. |
| `packages/mcp-server/src/smoke-http.mjs` | Built-output smoke for real HTTP process/readiness/initialize/tools/shutdown if the unit integration cannot prove packaged execution. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/mcp-server/src/root.ts` | Resolve one project/store at startup and capture fingerprint. No request-selected roots. |
| `packages/mcp-server/src/errors.ts` | Canonical tool error builder from MCP-022; transport-level HTTP/protocol errors remain transport errors. |
| `packages/mcp-server/src/ticket-docs.ts` | Shared MCP-019 document helper; remote transport must not fork handlers. |
| `packages/mcp-server/src/expected-project.ts` | Existing write fingerprint enforcement. |
| `packages/core/src/store.ts` | Store lifecycle/read-write behavior and no transport concerns. |
| `packages/core/src/types.ts` | Project/status types. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Tool count/names stay canonical; no per-tool HTTP variants. Add transport invocation docs only if this reference owns them. |
| `apps/gui/src/main/` child-process/settings modules | Future GUI-095 parent contract; readiness/status should be machine-readable and redacted. Do not implement GUI here. |
| MCP-026 docs | Required bearer authorizer/principal/rotation interface. Adapt whichever lands second without adding a parallel middleware path. |
| MCP-020 docs | Exact background dispatch tool identifiers to exclude remotely. |
| `.github/workflows/pr.yml` | Root verify reaches transport tests on Windows; no separate remote public integration job. |

## Exact public/internal contracts

- Shared server factory accepts immutable project/store context and named exposure policy.
- `local-stdio` policy preserves current tool set.
- `remote-http-v1` excludes exact background dispatch tool ids only.
- HTTP host requires `authorize(request) -> {principal}` or equivalent and fails closed when absent.
- Listener accepts loopback addresses only in v1.
- Endpoint path is `/mcp`; methods POST/GET/DELETE.
- One project/fingerprint is fixed at process start.
- Session registry is in-memory, bounded, principal-bound, idle-expiring, shutdown-cleaned.
- Ready event excludes credentials/session ids and is parseable without prose scraping.

## Do not modify

- Add bearer token generation/storage/constant-time implementation (MCP-026).
- Start/manage cloudflared (MCP-021).
- Add GUI settings/status (GUI-095).
- Change stdio default/provider registrations/tool semantics.
- Add public wildcard/LAN bind, unauthenticated production mode, OAuth, WebSocket, multi-board routing, browser CORS, persistent sessions, or remote dispatch.
- Hand-roll MCP JSON-RPC/SSE framing.
- Hand-edit generated bundle.
