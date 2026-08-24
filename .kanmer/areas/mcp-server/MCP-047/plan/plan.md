# Plan — MCP-047

## Governing docs

- **FRD-025 RA-TRANSPORT-1:** Preserve `/mcp` as the public Streamable HTTP endpoint.
- **FRD-025 RA-TUNNEL-1, RA-TUNNEL-3, RA-TUNNEL-4:** Keep provider input validated, loopback-only, child-process-safe, and limited to the cloudflared adapter.
- **ADR-0017:** Keep Cloudflare as an adapter; do not change MCP transport, authentication, or project routing.

## Approach

1. Keep `loopbackEndpoint()` strict: accepted targets remain HTTP, loopback-only, port-required, exact `/mcp`, and no query, fragment, credentials, or alternate path.
2. Add a small origin derivation that converts the already-validated endpoint to `protocol//host:port`. Use that solely for the generated Cloudflare ingress `service`.
3. Update the focused configuration tests to distinguish the retained MCP endpoint from rendered origin-only provider service, including IPv6 loopback coverage if present.
4. Run the installed real cloudflared ingress validate/rule commands manually against a synthetic config. Do not commit an environment-dependent CLI test: this host showed its process can exceed the existing bounded validation window, and the ordinary test suite must not spawn a real provider executable.
5. Update the provider manual to state that Cloudflare keeps the incoming `/mcp` path, so the origin service excludes it.
6. Build and run focused tests, real CLI validation, typecheck, and an appropriate HTTP/tunnel regression rail. Record outputs and limits in the implementation report.

## Why this approach

Changing the endpoint to an origin-only URL would violate the MCP contract. Switching to remote-managed token mode would enlarge the provider architecture and contradict the approved contract. Deriving the provider-only origin after existing endpoint validation is the smallest correction.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Broadening origin acceptance | Reuse strict endpoint validation and only derive origin after it passes. |
| Losing `/mcp` routing | Assert public `https://host/mcp` matches the origin-only ingress rule with real cloudflared. |
| Environment-dependent tests | Keep real CLI validation manual and keep the committed suite deterministic. |
| Documentation ambiguity | State public path and provider-origin distinction explicitly. |

## Proof

Proof will include the real cloudflared validation/rule exit codes, focused test counts, build/typecheck results, and a sanitized disposable locally managed tunnel outcome after code is merged. No hostname, token, credential JSON, or Cloudflare identifiers will be retained.
