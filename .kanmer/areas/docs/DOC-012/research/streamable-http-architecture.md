# Research — EPIC-010 Streamable HTTP architecture

## Primary sources consulted

- Model Context Protocol specification: **Transports — Streamable HTTP**.
- Model Context Protocol specification: **Authorization**.
- Model Context Protocol guidance: **Security Best Practices**.
- Official MCP TypeScript SDK server transport examples.
- Cloudflare documentation: **Cloudflare Tunnel**, locally managed tunnels, ingress, and origin service configuration.

The implementation tickets must re-check the currently pinned MCP SDK/spec version before coding. This document records the product contract; it must not copy an obsolete sample implementation blindly.

## Architecture decision

Kanmer gains a second transport around the same MCP server/tool registry:

```text
Existing providers ── stdio transport ─┐
                                      ├─ one tool registry / one board store
Remote clients ─ Streamable HTTP ─────┘
                         ↑
             loopback origin + bearer auth
                         ↑
          interchangeable tunnel adapter
                 (cloudflared first)
```

The existing stdio server remains the default and must be byte/behavior compatible. Remote mode is explicit. Transport code must not duplicate tool definitions, board-root logic, expected-project checks, structured errors, or protocol smokes.

## Endpoint contract

- One canonical MCP endpoint: `POST|GET|DELETE /mcp`.
- `POST` accepts MCP JSON-RPC messages and can return JSON or an event stream according to the SDK/spec negotiation.
- `GET` opens the optional server-to-client event stream for a valid session where the selected SDK transport uses it.
- `DELETE` closes the caller's session.
- All three methods require bearer authentication.
- Unsupported methods return `405` with the allowed methods.
- Non-MCP paths return `404`, except a deliberately separate loopback-only health endpoint if implementation tickets approve it.
- Enforce JSON/body size, header, connection, and request time limits before data reaches tool handlers.

Use the official TypeScript SDK's Streamable HTTP transport for framing, protocol-version handling, and session behavior. Do not hand-roll SSE parsing or JSON-RPC dispatch.

## Session model

Choose in-memory stateful sessions for the first implementation because they support the complete transport lifecycle without persisting protocol state:

- Generate an unguessable server-side session id with at least 128 bits of entropy.
- Return/accept the MCP session header exactly as required by the pinned specification/SDK.
- Bind a session to the authenticated token identity and one board/server instance.
- Keep sessions only in process memory with bounded count and idle TTL.
- Reject unknown/expired session ids; do not silently create a replacement for an in-session request.
- Remove session state on `DELETE`, timeout, transport close, and server shutdown.
- Process restart invalidates sessions; clients reconnect and initialize again.

No distributed session store, resume-across-restart guarantee, or multi-instance load balancing is included.

## Origin and host validation

Streamable HTTP servers can be exposed to DNS rebinding and browser-origin abuse. Validate request origin before authentication/tool dispatch:

- Bind the origin listener to `127.0.0.1`/`::1` by default, never all interfaces implicitly.
- Maintain an explicit allowlist for public tunnel origin(s) and permitted localhost origins.
- Reject a present, non-allowlisted `Origin` value.
- Validate/normalize `Host`/forwarded host only through trusted tunnel configuration; do not trust arbitrary forwarded headers.
- Do not enable broad CORS. Browser access is not required for the first remote MCP release.

## Single-board scope

One server process serves exactly one resolved Kanmer board/project. It captures the board/project fingerprint at startup and exposes it during initialization/orientation. Writes continue to use `expected_project` where supported. Remote URL paths must not select arbitrary repositories or board ids.

A second project requires a second explicitly configured process/listener/tunnel. Multi-board routing is a non-goal.

## Tool-surface policy

The transport reuses the canonical tool registry. It does not create remote variants of each tool. However, first-release remote policy must exclude background agent-dispatch capabilities, including MCP-020's controlled dispatch tool, even if installed in the local registry. Ordinary Kanmer board read/write tools remain governed by bearer authentication, expected-project checks, stage gates, and structured errors.

Implement the exclusion as one explicit transport exposure policy/list, tested against discovery. Do not scatter `if remote` checks through handlers.

## Process boundaries

- Core package: pure board/domain logic only.
- MCP server package: shared tool registry and stdio/HTTP transport composition.
- Remote host module/CLI: listener configuration, auth middleware, sessions, lifecycle, signals, structured logs.
- Tunnel adapter: separate child-process/provider interface receiving only local origin URL and provider config.
- GUI: configuration/orchestration/diagnostics; it must not implement protocol framing.

## Lifecycle

1. Resolve and validate one project/board.
2. Load/generate remote configuration and secret reference.
3. Bind loopback HTTP listener on configured or allocated port.
4. Report a structured ready record containing loopback endpoint, project fingerprint, PID, transport version, and authentication requirement—never the token.
5. Start the selected tunnel only after local health succeeds.
6. Expose tunnel URL/status through adapter/GUI.
7. On signal/GUI stop: stop accepting requests, close sessions, close HTTP server, stop tunnel child, redact logs, and exit with bounded cleanup.

If the tunnel dies, the local listener may remain available while status becomes degraded; restart policy belongs to the adapter/GUI ticket, not protocol handlers.

## Compatibility

- Stdio startup and provider registrations remain unchanged.
- Tool names, input schemas, result envelopes, error codes, and tool count remain canonical except for the deliberate remote exclusion policy.
- HTTP mode uses the same build output/package; no forked server implementation.
- Remote clients must perform normal MCP initialization before tools.
- Protocol-version mismatch returns the SDK/spec-defined response rather than a Kanmer-specific success envelope.

## Non-goals

- OAuth/OIDC or dynamic client registration.
- Multi-board HTTP endpoint.
- Remote background dispatch.
- Browser application/API.
- WebSocket transport.
- Persistent/distributed sessions.
- Cloud-hosted Kanmer relay service.
- Tunnel-provider logic inside MCP request handlers.
