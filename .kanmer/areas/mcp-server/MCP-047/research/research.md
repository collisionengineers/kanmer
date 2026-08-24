# Research — MCP-047

## Question

Why does the generated named-tunnel configuration fail real `cloudflared` validation, and what is the smallest safe correction?

## Findings

1. `packages/mcp-server/src/tunnels/cloudflared-config.ts` requires the local target endpoint to be exactly `http://127.0.0.1:<port>/mcp` (or IPv6 loopback) and writes that complete URL into the generated ingress `service` field.
2. On this Windows host, installed `cloudflared` 2026.8.2 rejects that configuration with: ingress rules cannot proxy to a different path on the origin; the path remains the same as the client request. The same fixture succeeds when the service is the loopback origin with no `/mcp` suffix, and `ingress rule https://…/mcp` matches the exact hostname rule.
3. The public endpoint must still remain `/mcp` under FRD-025 RA-TRANSPORT-1. Only the provider-origin representation changes: Cloudflare preserves the public request path, so public `/mcp` maps to loopback `/mcp` without placing a path in `service`.
4. The active machine-level Cloudflare service is a separate remote-managed tunnel with four connector connections, no ingress rules, no CNAME route in the accessible zones, and no persisted Kanmer remote-access registration. It cannot satisfy Kanmer's locally managed credentials-file contract.
5. Current Cloudflare documentation separates local `--config`/credentials-file operation from remote `--token-file` operation. The approved EPIC-010 and Kanmer manual contract requires local named-credentials mode; remote-token support is out of scope.

## Implication

Preserve strict validation of a loopback `/mcp` target, but render its URL origin (scheme, loopback host, port) as the Cloudflare ingress service. Update unit expectations and add a real-CLI integration test that is skipped when a usable local `cloudflared` executable is unavailable. No Cloudflare account, DNS, or token automation belongs in the product change.

## Sources

- `packages/mcp-server/src/tunnels/cloudflared-config.ts` and its focused test.
- Real local `cloudflared` 2026.8.2: embedded-path ingress validation exit 1; origin-only validation and `/mcp` rule matching exit 0.
- FRD-025 RA-TRANSPORT-1 and RA-TUNNEL-4; ADR-0017 network-boundary decision.
- [Cloudflare run parameters](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/) and [configuration file](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/), consulted 2026-08-24.
