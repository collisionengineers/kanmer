# Files — MCP-021

## Add

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/tunnels/types.ts` | Provider-neutral discriminated configuration, validated start input, adapter/handle interfaces, normalized lifecycle/status/event/diagnostic/error types, restart policy, and secret-reference types. No Cloudflare fields in generic result contracts. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` | First adapter: validate executable/version/mode/hostname/tunnel/credential reference/origin; build safe argument array; spawn with no shell/minimal environment; consume structured logs and loopback readiness; normalize status; own child PID; stop/cleanup; never receive Kanmer bearer material. |
| `packages/mcp-server/src/tunnels/cloudflared-config.ts` | Strict Cloudflare named-tunnel configuration validator and safe runtime ingress serializer with exact hostname→loopback origin plus terminal `http_status:404`; protected runtime file creation/removal; no arbitrary YAML fragments. |
| `packages/mcp-server/src/tunnels/supervisor.ts` | Provider-neutral bounded restart/backoff/jitter/generation state machine; no overlapping attempts; intentional-stop suppression; stable-period reset; injectable clock/randomness for deterministic tests. |
| `packages/mcp-server/src/tunnels/metrics.ts` | Loopback metrics-port allocation/ownership helper and bounded readiness polling if no canonical helper exists. Keep it provider-neutral only where useful; otherwise colocate under cloudflared without duplicating process logic. |
| `packages/mcp-server/src/tunnels/cloudflared.test.ts` | Pure and fake-child tests for validation, args/config, executable/version, credential safety, readiness/degraded/recovery, logs/redaction, process exit, cleanup, paths/metacharacters, and Quick Tunnel rejection. |
| `packages/mcp-server/src/tunnels/supervisor.test.ts` | Fake-clock tests for transitions, backoff/jitter/caps/stable reset/intentional stop/start failure/exhaustion/concurrency. |
| `packages/mcp-server/src/tunnels/fixtures/fake-cloudflared.mjs` | Test-only provider executable supporting deterministic `--version`/`--help`, JSON output, loopback readiness, flapping, exit/hang, malicious output, and signal behavior. It must never contact Cloudflare. |
| `packages/mcp-server/src/remote-host.ts` | Local orchestration boundary that verifies authenticated MCP-025/026 origin readiness/project generation before starting a selected tunnel adapter, combines redacted status, stops tunnel when origin changes/dies, and shuts down in the correct order. Add only if MCP-025 did not already establish an equivalent parent module. |
| `packages/mcp-server/src/remote-cli.mjs` | Internal/headless composition entry for validated HTTP host plus optional tunnel adapter using protected config/secret references and machine-readable events. Preserve `http-cli.mjs` as a local-only diagnostic path if present; do not make stdio default invoke this. |
| `packages/mcp-server/src/remote-host.test.ts` | Integration with fake HTTP host/authorizer/provider proving local-first start, no tunnel on auth/origin failure, public status dimensions, origin generation invalidation, stop order, and canary redaction. |

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/http.ts` | Expose the narrow local-origin lifecycle/readiness/generation signal required by `remote-host`; do not add provider logic or pass bearer secrets to the adapter. |
| `packages/mcp-server/src/http-cli.mjs` | Preserve local-only mode and structured readiness. Modify only to expose parent control/ready metadata consumed by the remote orchestrator. |
| `packages/mcp-server/package.json` | Export/wire tunnel modules, remote-host CLI, tests, and optional cloudflared doctor/version smoke while preserving the stdio default bin and local HTTP command. Add a YAML dependency only if no existing safe serializer can produce the documented config. |
| `package.json` | Route the canonical tunnel/remote-host tests through root test/verify exactly once. |
| `scripts/verify.mjs` | Confirm the shared verification rail reaches fake-provider tests and local packaged smoke. Do not require a Cloudflare account/public network in normal PR verification. |
| `packages/mcp-server/src/smoke-http.mjs` | Preserve authenticated local HTTP smoke; expose reusable readiness/client helper to remote-host smoke rather than duplicate MCP protocol logic. |
| `packages/mcp-server/src/smoke-remote.mjs` | Add or extend a built-output smoke using the fake provider, protected temporary credential reference, authenticated local MCP origin, readiness/degraded/stop lifecycle, and canary scan. If this file is new, ensure the root rail invokes it once. |
| `docs/functional/frd/FRD-025-remote-access.md` | Consume the accepted adapter/lifecycle requirements. Modify only through approved correction if implementation reveals a conflict; use actual accepted path. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Consume provider-neutral/cloudflared-first process boundary; do not silently couple architecture to Cloudflare. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/mcp-server/src/http-auth.ts` | MCP-026 authorizer/metadata boundary. The adapter may see only `authRequired` and a non-secret generation id/fingerprint, never a raw token/verifier. |
| `packages/mcp-server/src/http-session-registry.ts` | Tunnel stop does not replace normal session cleanup; remote host stops tunnel then HTTP/session lifecycle in accepted order. |
| `packages/mcp-server/src/root.ts` | One-project startup and fingerprint. |
| `packages/mcp-server/src/errors.ts` | Canonical coded local errors/redaction. |
| `packages/mcp-server/src/logging.ts` or existing logger | Reuse one bounded structured event/redaction path. |
| `apps/gui/src/main/` process supervisor/settings modules | Reuse cross-platform child-tree, app-data, and event IPC conventions where available. Do not make MCP package import Electron. |
| `apps/gui/src/main/remote*.ts` | GUI-095 may create these later; define contracts so whichever ticket lands second consumes one adapter rather than duplicating cloudflared spawning. |
| `scripts/release.mjs` and packaging config | Determine whether an executable is already bundled. This ticket does not add download/update/distribution without an approved packaging decision. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Tunnel modules must not enter the default stdio plugin unless shared source changes require canonical regeneration. Never hand-edit. |
| `.github/workflows/pr.yml` | Run fake-provider/local tests cross-platform; real public tunnel remains MCP-028/manual environment. |
| DOC-013 and MCP-027 docs | Manual and doctor consume executable/version/config/status/error contracts. |

## Configuration contract

Generic persisted settings contain:

- provider id `cloudflared`;
- supported mode discriminator;
- executable reference/path policy;
- public HTTPS hostname;
- tunnel id/name/UUID as required by the chosen official mode;
- provider credential-file/secret reference, never contents;
- restart policy;
- enabled/auto-start flag owned by GUI-095.

Runtime-only input contains exact loopback origin, project fingerprint, HTTP/auth generation, event sink, and abort signal.

## Cloudflared v1 contract

- Named operator-provisioned tunnel and hostname only.
- Prefer locally managed credentials/config; support another official mode only as a separately validated discriminator.
- Generated runtime ingress maps one exact hostname to one exact loopback origin and ends with `http_status:404`.
- `--no-autoupdate`, structured JSON logs where supported, loopback-only metrics/readiness, no shell, minimal environment.
- Public URL derives from configured hostname.
- Quick Tunnel omitted/rejected for production.
- No account/tunnel/DNS creation and no service installation.

## Do not modify

- Core/domain/tool handlers, board files, stdio behavior, bearer implementation, tool surface, or project selection.
- Add provider account APIs, DNS mutation, executable auto-download/self-update, Windows service installation, Quick Tunnel as production, OAuth, relay, multi-board, or remote dispatch.
- Pass Kanmer bearer or Cloudflare credential contents in argv/config/logs/events/settings.
- Trust arbitrary forwarded headers or public metrics bind.
- Kill unrelated cloudflared processes.
- Require real Cloudflare credentials/network in the normal test rail.
- Hand-edit generated plugin bytes.
