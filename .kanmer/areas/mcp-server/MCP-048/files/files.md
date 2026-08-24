# Files — MCP-048

## Where the change lands

| Path | Why |
|---|---|
| `packages/mcp-server/src/tunnels/readiness.ts` | Separate the bounded per-request timeout from polling cadence while retaining a finite total deadline and loopback-only `/ready` validation. |
| `packages/mcp-server/src/tunnels/readiness.test.mjs` | Add a deterministic loopback server test for delayed HTTP 200 after transient 503; preserve invalid-endpoint and timeout assertions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/tunnels/cloudflared.ts` | The readiness helper gates owned Cloudflared child startup and subsequent status recovery; changing its error contract or endpoint surface would ripple into adapter lifecycle. |
| `packages/mcp-server/src/tunnels/cloudflared.test.mjs` | Adapter tests use the helper through production defaults and prove provider process cleanup; they must remain green without introducing a provider dependency. |
| `docs/functional/frd/FRD-025-remote-access.md` | RA-TUNNEL-3 and RA-TUNNEL-5 require bounded, loopback-local readiness and local-first startup. |
| `packages/mcp-server/src/tunnels/fixtures/fake-cloudflared.mjs` | The fixture is intentionally local and must not be repurposed into a Cloudflare-control-plane test. |

## Ripple effects

The production caller is `CloudflaredAdapter.start`/`checkReadiness`. No public route, credentials, generated artifact, dependency, schema, GUI, or governing document changes are expected. Focused readiness and Cloudflared adapter tests, then the MCP test rail and repository verification, provide evidence.

## Out of scope

- Cloudflare account, tunnel, DNS, Worker, or remote-client operations (MCP-028).
- GUI behavior or settings-write remediation (GUI-129).
- Changing success criteria, timeout error code, loopback endpoint validation, or turning a timeout into success.
- New dependencies, retries beyond the existing bounded readiness window, and public-network tests.
