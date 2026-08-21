# Files — MCP-021

## Add

| Path | Exact responsibility |
|---|---|
| packages/mcp-server/src/tunnels/types.ts | Provider-neutral discriminated configuration, validated start input, adapter/handle interfaces, lifecycle/status/diagnostic types, restart policy, and opaque credential references. |
| packages/mcp-server/src/tunnels/cloudflared.ts | Named-credentials Cloudflared adapter: strict validation, protected runtime config, direct child process, loopback readiness, bounded diagnostics, lifecycle status, owned shutdown, and cleanup. |
| packages/mcp-server/src/tunnels/cloudflared-config.ts | Exact hostname and loopback-origin validation plus fixed ingress serializer with terminal http_status:404 catch-all. |
| packages/mcp-server/src/tunnels/cloudflared-validate.ts | Bounded direct version/help validation and documented local ingress validate/rule checks. |
| packages/mcp-server/src/tunnels/readiness.ts | Loopback metrics-port allocation and bounded /ready polling. |
| packages/mcp-server/src/tunnels/logs.ts | Bounded redacted provider diagnostic buffer. |
| packages/mcp-server/src/tunnels/supervisor.ts | Provider-neutral bounded restart/backoff/generation lifecycle with no overlapping attempts. |
| packages/mcp-server/src/tunnels/fixtures/fake-cloudflared.mjs | Standalone no-network fake provider for version/help, local readiness, and signal shutdown. |
| packages/mcp-server/src/remote-host.ts | Authenticated local HTTP-first composition, optional local verification callback, tunnel lifecycle, origin invalidation, redacted status, and shutdown ordering. |
| packages/mcp-server/src/remote-cli.ts | Explicit headless Cloudflared composition from protected environment/file references; no secret-bearing arguments. |
| packages/mcp-server/src/smoke-remote.mjs | Built local-only fake-provider lifecycle smoke. |

## Modify

| Path | Exact responsibility |
|---|---|
| packages/mcp-server/package.json | Build and run the HTTP/tunnel test suite while preserving stdio and local HTTP entry points. |
| packages/mcp-server/src/http.ts | Consume the final MCP-025/026 authenticated host lifecycle and project identity metadata. |
| package.json | Preserve the canonical root build/test/typecheck rails. |

## Tests

The implementation is covered by the corresponding .test.mjs files beside each tunnel/remote module, including exact argv/environment/config checks, symlink and credential safety, readiness loss/recovery, bounded logs, ingress validation, supervisor concurrency, stop-order, and fake-provider smoke cases.

## Inspect / reuse

MCP-025/026 own the Streamable HTTP and bearer-auth contracts. MCP-027 owns connector doctor and MCP-028 owns final real public proof. GUI-095 consumes this adapter contract later.

## Do not modify

Core/domain/tool handlers, board files, stdio behavior, bearer implementation semantics, provider account APIs, DNS mutation, executable download/self-update, Windows service installation, Quick Tunnels as production, or public Cloudflare acceptance.
