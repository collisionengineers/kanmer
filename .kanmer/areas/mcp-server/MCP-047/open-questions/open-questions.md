# Open questions — MCP-047

## Resolved

- [x] Does Cloudflare preserve the client request path for a local ingress origin? Yes; real `cloudflared` 2026.8.2 rejects an embedded origin path and validates the origin-only rule for public `/mcp`.
- [x] Does the correction require remote-managed token mode? No; the approved provider contract remains locally managed named-credentials mode.

## Parked (explicitly deferred)

None.
