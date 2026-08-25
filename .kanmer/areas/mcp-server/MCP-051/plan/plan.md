# Plan

## Problem

The production Cloudflare connector can spend more than ten seconds on connectivity pre-checks and QUIC-to-HTTP/2 fallback. On this Windows host it registered four HTTP/2 edge connections roughly 17–19 seconds after launch, but Kanmer's fixed 10-second readiness deadline killed the owned child first and surfaced `TUNNEL_READINESS_TIMEOUT`.

## Implementation

1. Replace the 10-second production default with a named exported 60-second bounded policy. This remains finite and fail-closed, while covering documented provider fallback and slower edge establishment.
2. Add regression coverage asserting the production policy and retain the existing explicit short-timeout tests for deterministic failure behavior.
3. Run focused tunnel tests, full verification, and a real named-credentials packaged-host launch against `mcp.rivetandrelay.co.uk`.
4. Require `/ready` success, active Cloudflare connections, unauthenticated `/mcp` rejection, and authenticated MCP initialization before PASS.

## Scope limits

No authentication change, DNS mutation, provider replacement, compatibility path, or new dependency. The existing `waitForTunnelReadiness` and Cloudflare adapter remain the sole implementation path.
