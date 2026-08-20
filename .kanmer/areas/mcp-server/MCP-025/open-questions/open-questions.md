# Open questions — MCP-025

## Resolved decisions

- **Which SDK API is used?** The exact Streamable HTTP API from the repository's pinned official MCP TypeScript SDK; implementation must inspect it before coding rather than copy an older example.
- **Does this create a second tool registry?** No. Extract/reuse one shared server/tool registration factory.
- **Does stdio remain the default?** Yes, with the same executable/provider registration/discovery semantics.
- **Can HTTP start without authorization?** Production host creation fails closed when no authorizer is supplied. Tests may inject a deterministic stub.
- **Can this ticket expose a public tunnel?** No. Listener is loopback-only; MCP-021 remains blocked until MCP-026 lands.
- **Endpoint and methods?** `/mcp`, POST/GET/DELETE only.
- **Session model?** In-memory stateful, cryptographically generated, principal-bound, bounded, idle-expiring, and destroyed on restart/shutdown.
- **One server object or one per session?** Follow the pinned SDK's required ownership. Never share mutable transport/session state incompatibly; share only immutable project/tool definitions.
- **Framework?** Prefer existing SDK/native Node facilities. Add Express or another framework only if the pinned SDK's supported secure adapter requires it and document the reason.
- **Remote tool set?** Local tool set minus the exact MCP-020 background-dispatch capability set, applied through one named exposure policy.
- **Can requests select a board?** No. One resolved project/fingerprint is fixed at startup.
- **How is readiness reported?** One machine-readable redacted event after project/auth/listener/session-registry readiness.
- **Does HTTP protocol framing live in Kanmer code?** No, use the official SDK.
- **Is generated plugin rebuild required?** Only if the shared refactor changes shipped stdio bundle bytes; then use main-checkout canonical build/check.
- **Are DOC-012 paths assumed?** Consume the actual accepted FRD/ADR paths and update ticket refs if numbering changed.

## Deferred to dependent tickets

- `[MCP-026]` Bearer generation, storage/reference, comparison, rotation, and real principal.
- `[MCP-021]` Tunnel adapter/cloudflared lifecycle.
- `[GUI-095]` GUI configuration/status/secret operations.
- `[MCP-027]` Connector doctor.

No unresolved implementation questions remain.
