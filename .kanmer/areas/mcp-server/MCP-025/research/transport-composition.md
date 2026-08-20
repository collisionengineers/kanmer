# Research — MCP-025 Streamable HTTP transport composition

## Governing constraint

This ticket adds a transport around the existing Kanmer MCP server. It must not fork the tool registry, board-root resolution, error model, expected-project behavior, or stdio entry point. The production HTTP path remains unusable for public/tunnel exposure until MCP-026 supplies mandatory bearer authorization.

Before implementation, inspect the exact pinned `@modelcontextprotocol/sdk` version and its official Streamable HTTP server examples. SDK exports and adapter APIs have changed across releases; use the API shipped in this repository rather than copying a version-mismatched example.

## Recommended module boundary

Refactor current startup into three responsibilities:

1. `createKanmerMcpServer(context, exposurePolicy)` — constructs one MCP server and registers the canonical allowed tools.
2. stdio entry — resolves project/store, creates the server with local exposure policy, connects official stdio transport, preserves existing signals/output.
3. HTTP host — resolves one project/store, creates per-session or session-associated server/transport objects as required by the pinned SDK, handles `/mcp`, limits, lifecycle, and structured readiness.

Do not export a singleton server across incompatible client sessions if the SDK transport expects a distinct server connection. Share immutable store/tool definitions, not mutable protocol session state.

## Security staging

Transport implementation must be secure even before authentication ticket integration:

- bind loopback only;
- require an injected authorization function at host construction;
- default production host creation to fail closed when no authorizer is supplied;
- permit a deterministic test authorizer only in tests;
- do not wire GUI/tunnel/public startup in this ticket;
- mark any developer CLI as experimental/internal and refuse non-loopback address.

MCP-026 replaces the test/fail-closed boundary with the real bearer authorizer. MCP-021 must remain blocked from tunnelling until both tickets land.

## Endpoint and SDK behavior

Use official SDK Streamable HTTP handling for JSON-RPC, protocol negotiation, JSON versus SSE responses, session headers, and cancellation. The host owns ordinary HTTP concerns:

- exact path `/mcp`;
- POST, GET, DELETE only;
- authentication hook before body parsing and session lookup;
- explicit `404`, `405`, content-type, body-size, request-time, and connection limits;
- Origin/host validation hooks required by DOC-012;
- session registry/caps/TTL;
- graceful shutdown and structured redacted logs.

Avoid Express unless the repo/SDK already standardizes on it. Native Node HTTP has a smaller dependency/runtime surface, while an SDK-provided Express app may include important host/origin protections. Choose after inspecting the pinned SDK and document the reason; do not implement protocol framing manually in either case.

## Tool exposure policy

The server factory should accept a named policy, not a boolean scattered through handlers:

- `local-stdio`: all canonical tools permitted by the current release.
- `remote-http-v1`: canonical board tools except background agent-dispatch capabilities.

Generate discovery from the same registry definitions filtered once at registration. Calling an excluded tool must fail as unknown/unavailable, not reach the handler. Add an invariant test that the remote list equals local list minus the explicit excluded set.

## One-project process

Resolve one board at startup through existing root/store logic, capture its project fingerprint, and never accept project paths in HTTP requests. Project change requires process restart. All supported writes retain `expected_project` handling from MCP-022.

## Output and process contract

The HTTP host should emit one machine-readable ready event to a dedicated status channel/stdout contract only after:

- root/project validated;
- authorizer present;
- listener bound to loopback;
- session registry initialized.

Fields: kind/version, PID, bind address, allocated port, local endpoint, project id/fingerprint, protocol/transport mode, auth-required true. Never include token or full secret/session id.

All protocol response bytes remain on the socket. Operational logs go to stderr or the repository's structured logger. A parent GUI/adapter must be able to parse readiness without scraping prose.

## Build and compatibility

Preserve current stdio executable and provider manifests. If extracting a shared factory changes generated plugin bytes, rebuild through the canonical main-checkout flow and prove stdio discovery/protocol behavior unchanged. The remote host may be a separate package bin/export; it must not become the plugin's default command.

## Sources to re-check at implementation

- Pinned MCP TypeScript SDK Streamable HTTP server API/examples.
- MCP transport specification supported by that SDK.
- MCP security guidance on Origin validation and local binding.
- DOC-012 FRD/ADR final accepted paths and requirement ids.

## Non-goals

- No bearer implementation/token storage (MCP-026).
- No tunnel child process (MCP-021).
- No GUI controls (GUI-095).
- No OAuth, WebSocket, multi-board routing, browser CORS, persistent sessions, or remote dispatch.
- No hand-written MCP framing.
