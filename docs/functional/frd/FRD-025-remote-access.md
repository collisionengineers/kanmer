---
status: draft
covers: planned remote MCP access (EPIC-010)
---

# FRD-025 — Remote access

## Purpose and scope

Kanmer must let an explicitly authorised remote MCP client reach one local Kanmer board without changing the existing local stdio experience. Remote access is an opt-in process mode, not a new board format, a browser API, or a second tool implementation. It uses one MCP Streamable HTTP endpoint, mandatory bearer authentication, a loopback-only local listener, and an interchangeable tunnel adapter. `cloudflared` is the first adapter.

The end state is one durable, inspectable contract for the implementation tickets [[MCP-021]], [[MCP-025]], [[MCP-026]], [[MCP-027]], [[MCP-028]], [[GUI-095]], and [[DOC-013]]. The final integrated proof belongs to MCP-028.

### Actors, assets, and boundaries

| Actor / component | Responsibility | Trust boundary |
|---|---|---|
| Local operator | Enables, stops, rotates, and inspects a remote endpoint for one project. | Chooses project and secret reference. |
| Remote MCP client | Authenticates, initializes the MCP session, and invokes the approved remote tool surface. | Untrusted until bearer authentication and origin checks pass. |
| Remote host | Composes the canonical MCP registry with the Streamable HTTP transport and owns listener/session lifecycle. | Must not select a project from a request. |
| Tunnel adapter / provider | Publishes a configured loopback origin and reports lifecycle state. | Provider controls are defence in depth, not application identity. |
| GUI and connector doctor | Configure, operate, and diagnose; never frame MCP protocol messages. | Must redact all secret-bearing data. |
| Board/store | Retains normal file-backed board semantics, document gates, expected-project checks, and activity behavior. | Remains one resolved project per host process. |

Protected assets are board data and mutating-tool authority; the resolved project fingerprint; bearer and provider credentials; session identifiers; host/tunnel processes; and redacted diagnostics. A remote URL, request body, or request path must never select an arbitrary repository or board.

## Requirements

### Compatibility and project scope

- **RA-COMPAT-1 — stdio remains default.** Existing stdio startup, provider registrations, tool names, schemas, result envelopes, error codes, and normal local discovery remain compatible. Remote mode is explicit and can be disabled independently.
- **RA-COMPAT-2 — one registry.** HTTP and stdio use the same canonical MCP tool/resource/prompt registry and root-resolution/expected-project behavior. A remote-specific duplicate registry or per-tool `if remote` branches are prohibited.
- **RA-PROJECT-1 — one project per process.** A remote host resolves one board/project at startup, captures its immutable project fingerprint, and serves no other board for its lifetime.
- **RA-PROJECT-2 — no request routing.** URL paths, headers, messages, and client arguments cannot choose a repository, board root, or project id. Changing project stops and recreates the listener/tunnel rather than hot-routing an existing endpoint.
- **RA-PROJECT-3 — orientation.** Ready/status/orientation data exposes the non-secret project fingerprint. Connector doctor verifies it and supported writes retain their existing `expected_project` enforcement.

### Transport and session contract

- **RA-TRANSPORT-1 — endpoint.** The canonical remote MCP endpoint is `/mcp`. It accepts `POST`, `GET`, and `DELETE` as defined by the pinned MCP Streamable HTTP specification/SDK; unsupported methods return `405` with the permitted methods and unrelated paths return `404`.
- **RA-TRANSPORT-2 — official framing.** The implementation uses the official TypeScript MCP SDK transport for JSON-RPC framing, protocol negotiation, session header behavior, and event-stream behavior. It must not hand-roll SSE parsing or JSON-RPC dispatch.
- **RA-TRANSPORT-3 — initialization.** Clients perform normal MCP initialization. Protocol-version mismatch and response media handling follow the SDK/specification rather than a Kanmer success envelope.
- **RA-TRANSPORT-4 — stateful sessions.** First release uses in-memory stateful sessions. The host generates an unguessable server-side identifier with at least 128 bits of cryptographic entropy, binds it to the authenticated credential identity and host instance, and follows the pinned SDK/specification header name and lifecycle.
- **RA-TRANSPORT-5 — bounded lifetime.** Sessions have bounded total and per-identity counts plus an idle TTL. Unknown, expired, or wrong-identity session ids are rejected; an in-session request never silently creates a replacement session. Delete, timeout, close, shutdown, and token rotation remove state. Process restart invalidates all sessions and clients initialize again.
- **RA-TRANSPORT-6 — resource limits.** Before tools run, the host enforces configured bounds for headers, JSON body, connections, sessions, concurrent requests, request duration, and idle duration. Limit failures are structured/redacted and do not expose board contents.
- **RA-TRANSPORT-7 — health and readiness.** A separate health endpoint, if supplied, binds only to loopback and exposes no tool or secret. Ready/status output identifies the loopback endpoint, process id, project fingerprint, transport version, authentication requirement, and component health without a token or session id.

### Authentication, bind, and origin security

- **RA-AUTH-1 — bearer first.** `POST`, `GET`, and `DELETE` require `Authorization: Bearer <token>` before MCP body parsing, session creation, or tool discovery. Missing, malformed, wrong, or query/cookie-supplied credentials receive a generic unauthenticated response.
- **RA-AUTH-2 — secret quality and handling.** Generated bearer secrets contain at least 32 random bytes and are URL-safe encoded. Equal-length secrets are compared in constant time. Full tokens, authorization headers, session ids, provider credentials, and document/prompt bodies never appear in URLs, command-line arguments, logs, crash diagnostics, clipboard-by-default UI, or exported configuration.
- **RA-AUTH-3 — references not plaintext settings.** GUI-managed secrets use OS credential storage where available; other modes use a protected secret reference, environment, stdin, or protected file mechanism selected by implementation research. Diagnostics show only a non-reversible short fingerprint.
- **RA-AUTH-4 — rotation.** Rotation atomically replaces the active secret, invalidates every session, requires reconnect, updates a redacted fingerprint/timestamp, attempts removal of the old stored reference, and emits a redacted audit event. There is no first-release dual-token grace period.
- **RA-SEC-1 — loopback default.** The local HTTP listener binds to `127.0.0.1` and/or `::1` by default. Wildcard/LAN bind is refused unless a future approved security design replaces this requirement.
- **RA-SEC-2 — origin and host validation.** A present `Origin` must be in an explicit allowlist and is rejected before authentication/body processing otherwise. Wildcard CORS and a browser-API promise are prohibited. Forwarded host/proto information is trusted only through a configured tunnel boundary; arbitrary forwarded headers are not trusted.
- **RA-SEC-3 — layered provider controls.** Tunnel-provider access controls may add protection but never substitute for Kanmer bearer authentication.

### Tool exposure and mutation safety

- **RA-TOOLS-1 — explicit exposure policy.** Remote discovery and invocation use one centrally tested transport exposure policy. Normal board tools retain existing document/stage/question/expected-project gates and structured errors.
- **RA-TOOLS-2 — dispatch exclusion.** Background agent-dispatch capabilities, including MCP-020’s controlled dispatch surface when locally installed, are absent from remote discovery and rejected remotely. The exclusion is not distributed through individual handlers.
- **RA-TOOLS-3 — compatibility evidence.** Tests prove stdio discovery is unchanged and remote discovery differs only by the approved exclusion policy.

### Tunnel adapter and lifecycle

- **RA-TUNNEL-1 — provider-neutral contract.** An adapter provides validated `doctor`, `start`, `status`, `stop`, and redacted logs/events. Inputs are a validated loopback origin URL, provider configuration/secret references, and requested hostname/mode; generic adapter data must not acquire provider-specific fields.
- **RA-TUNNEL-2 — lifecycle states.** Adapter status normalizes `stopped`, `starting`, `connected`, `degraded`, `failed`, and `stopping`, together with a non-secret reason and timestamps.
- **RA-TUNNEL-3 — safe process boundary.** Tunnel processes use explicit executable resolution/version checks, argument arrays without a shell, validated paths/hostnames, an environment allowlist, bounded output buffers, owned PID tracking, and graceful-then-forced bounded shutdown. An adapter cannot mutate the board or register MCP tools.
- **RA-TUNNEL-4 — cloudflared first.** The first adapter targets Cloudflare Tunnel’s documented hostname-to-local-service routing and `cloudflared` lifecycle. Its public hostname maps to the loopback listener, not a new transport. Executable packaging/download is deliberately not promised until implementation research decides it.
- **RA-TUNNEL-5 — local first.** Startup resolves the board, validates secret/configuration, binds and health-checks the loopback listener, then starts the tunnel. A tunnel failure can leave the local listener available while remote state is `degraded`; retry/backoff policy belongs to the adapter/GUI implementation.
- **RA-TUNNEL-6 — stop order.** Stop accepting remote requests, close sessions, close listener, stop the tunnel child, and redact/finalize diagnostics. Shutdown must avoid orphan children.

### GUI, doctor, manual, and observability

- **RA-GUI-1 — GUI-095 contract.** The GUI provides project-scoped settings/status, explicit start/stop, guarded secret creation/rotation, copyable endpoint without secret disclosure, project-switch confirmation, and redacted diagnostics. It orchestrates processes; it does not implement MCP framing.
- **RA-DOCTOR-1 — MCP-027 matrix.** Doctor checks executable/version and configuration; loopback bind; negative and positive auth; initialize/handshake; expected project fingerprint; remote tool-policy discovery; and tunnel reachability when requested. Results name component and safe remediation, never credentials.
- **RA-DOC-1 — DOC-013 contract.** The manual explains concepts, safety boundaries, configuration, operation, and diagnosis in provider-neutral language. It does not become a store for live tokens, hostnames, or implementation-only command recipes.
- **RA-OBS-1 — redacted local diagnostics.** Structured local events cover host/listener start-stop, project fingerprint, auth aggregates, session create/close/expiry, request tool/duration/result code, limit rejection, tunnel lifecycle, and rotation. They exclude secret values, authorization headers, full session ids, request bodies, document contents, prompts, and provider credentials. Retention/output buffers are bounded; exports remain redacted.
- **RA-OBS-2 — distinct health.** Status distinguishes board, listener, authentication, session capacity, tunnel, and remote-handshake health rather than collapsing them into one boolean.

## Configuration and precedence

Remote configuration is project-scoped and explicit. It contains no plaintext application bearer token. The implementation defines and validates a precedence order for explicit CLI/GUI configuration, protected secret reference, and safe defaults; it rejects conflicting/unsafe values rather than silently widening exposure. The default listener is loopback, the default transport endpoint is `/mcp`, and the default remote policy is the canonical registry minus dispatch.

## Acceptance and traceability

| Scenario / evidence | Requirement families | Primary implementation / verification |
|---|---|---|
| Existing stdio startup and discovery remain unchanged; remote discovery excludes only dispatch. | RA-COMPAT, RA-TOOLS | MCP-025, MCP-028 |
| Valid bearer initializes one project; absent/wrong/similar token does not parse MCP. | RA-AUTH, RA-PROJECT | MCP-026, MCP-028 |
| `/mcp` POST/GET/DELETE, session expiry/delete/restart, body/time/cap failures follow the SDK contract. | RA-TRANSPORT | MCP-025, MCP-028 |
| Disallowed Origin and wildcard bind are rejected; query/cookie token is ignored/rejected. | RA-SEC, RA-AUTH | MCP-025, MCP-026, MCP-028 |
| Cross-token/expired session, token rotation, wrong expected project, and excluded dispatch fail safely. | RA-TRANSPORT, RA-AUTH, RA-PROJECT, RA-TOOLS | MCP-026, MCP-028 |
| Adapter validates, starts cloudflared only after local health, reports degradation, and leaves no child on shutdown. | RA-TUNNEL | MCP-021, GUI-095, MCP-028 |
| GUI, doctor, and manual expose safe project-scoped operation and redacted diagnosis. | RA-GUI, RA-DOCTOR, RA-DOC, RA-OBS | GUI-095, MCP-027, DOC-013 |

MCP-028 records final cross-component proof on a real remote client/second machine. Every implementation report records the requirements it covers and the evidence collected; proof records the merged-main result.

## Non-goals and deferred work

This release does not provide OAuth/OIDC, per-user identity/scopes, dynamic registration, multi-board routing, a hosted relay, browser/CORS application access, WebSocket transport, persistent/distributed sessions, high availability, remote background dispatch, or additional tunnel providers. It does not change stdio behavior, accept an implicit public bind, or promise bundled/downloading `cloudflared`.

## Sources

- Model Context Protocol, [Streamable HTTP transport specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), consulted 2026-08-20. It defines POST messaging and calls out Origin validation, localhost binding, and authentication for local servers.
- Model Context Protocol TypeScript SDK, [server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md), consulted 2026-08-20. The repository currently pins `@modelcontextprotocol/sdk` to `^1.30.0`; implementation must re-check the supported API/spec pairing before coding.
- Cloudflare, [Create a locally-managed tunnel](https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/) and [Tunnel routing](https://developers.cloudflare.com/tunnel/routing/), consulted 2026-08-20. These support the provider vocabulary only; they do not replace Kanmer’s application authentication contract.

Related: [[EPIC-010]] · [[MCP-021]] · [[MCP-025]] · [[MCP-026]] · [[MCP-027]] · [[MCP-028]] · [[GUI-095]] · [[DOC-013]] · FRD-022 · FRD-023 · ADR-0017.
