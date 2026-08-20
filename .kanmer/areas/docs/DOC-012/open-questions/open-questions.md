# Open questions — DOC-012

## Resolved decisions

- **Transport?** MCP Streamable HTTP through the official/pinned TypeScript SDK, around the existing shared tool registry.
- **Does stdio change?** No. It remains the default and compatible path.
- **Endpoint?** One canonical `POST|GET|DELETE /mcp` endpoint, plus at most a separate loopback-only health endpoint.
- **Session mode?** In-memory stateful sessions with cryptographic server-generated ids, bounded count/idle TTL, and no persistence across restart.
- **Authentication?** Mandatory application bearer token on every MCP method before parsing/session creation. OAuth is deferred.
- **Network bind?** Loopback only by default; wildcard/LAN bind is refused in this release.
- **TLS?** Public TLS is provided by the selected tunnel. Bearer auth remains mandatory independently.
- **Origin/CORS?** Explicit origin allowlist and no wildcard CORS/browser API promise.
- **How many boards per endpoint?** Exactly one board/project per server process and URL.
- **May the URL select a repository?** No.
- **Which tools are exposed remotely?** Canonical board tools subject to existing gates, except background dispatch capabilities are deliberately excluded by transport policy.
- **First tunnel provider?** `cloudflared`, behind a provider-neutral lifecycle/status interface.
- **Can provider controls replace bearer auth?** No; they are optional defence in depth.
- **Where are tokens stored?** OS credential storage for GUI-managed configuration where available; otherwise a protected secret reference/environment mechanism. Never command-line/query/log/plain exported settings.
- **Does token rotation preserve sessions?** No. Rotation invalidates all sessions and requires reconnect.
- **Can sessions survive process restart?** No.
- **Are FRD-025 and ADR-0017 final filenames?** Use them if canonical indexes confirm FRD-024/ADR-0016 are the current highest numbers; otherwise select the next free numbers and update all references before writing.
- **Does this ticket include user setup steps?** No. DOC-013 owns the provider-neutral manual after implementation contracts stabilize.

## Deferred explicitly

- `[deferred]` OAuth/OIDC, per-user identity/scopes, dynamic client registration.
- `[deferred]` Multi-board routing or hosted relay.
- `[deferred]` Persistent/distributed sessions and HA.
- `[deferred]` Browser/CORS application access.
- `[deferred]` Remote background agent dispatch.
- `[deferred]` Additional tunnel providers beyond the adapter contract.

No unresolved implementation questions remain.
