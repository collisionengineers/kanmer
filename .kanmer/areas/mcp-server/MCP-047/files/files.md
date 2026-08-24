# Files — MCP-047

| File | Change | Risk / verification |
|---|---|---|
| `packages/mcp-server/src/tunnels/cloudflared-config.ts` | Derive a pathless loopback origin for rendered ingress while retaining the endpoint's strict `/mcp` validation. | Do not widen acceptable hosts, schemes, paths, query strings, credentials, or public hostnames. |
| `packages/mcp-server/src/tunnels/cloudflared-config.test.mjs` | Assert the accepted target endpoint produces an origin-only `service` value. | Retain all fail-closed test cases. |
| `packages/mcp-server/src/tunnels/cloudflared-validate.test.mjs` or new focused integration test | Exercise installed real cloudflared only when explicitly available, otherwise skip; prove ingress validate/rule accepts the generated config. | No account login, tunnel creation, DNS change, or credential content read. |
| `docs/manual/providers/cloudflared.md` | Clarify that cloudflared preserves `/mcp` and the provider service value is origin-only. | Keep credentials/hostnames out of documentation. |

## Context files

| File | Why it must be read |
|---|---|
| `docs/functional/frd/FRD-025-remote-access.md` | Defines mandatory public `/mcp`, loopback bind, and provider-neutral safety requirements. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Preserves the adapter boundary and rules out a provider-specific transport change. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` | Shows the generated config is validated with real cloudflared before spawning the owned child. |
| `packages/mcp-server/src/tunnels/cloudflared-validate.ts` | Defines the existing validate and route-match invocation boundary. |
| `docs/manual/remote-access.md` | Defines the operator fields and locally managed named-tunnel mode. |

## Out of scope

- Remote-managed token support, Cloudflare account/DNS/tunnel automation, Cloudflare Access, Quick Tunnels, Workers-hosted Kanmer, and changes to the MCP public endpoint or bearer authentication.
