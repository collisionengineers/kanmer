# Files — MCP-027

## Add

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/doctor/types.ts` | Schema-v1 doctor modes, stable check ids, explicit severity/status, ordered result/report, project/endpoint safe metadata, repair entries, exit semantics, injected dependency interfaces, and JSON-safe serialization. |
| `packages/mcp-server/src/doctor/checks.ts` | Canonical ordered check registry with prerequisite graph, mode applicability, timeout/cancellation, safe observed/expected details, and repair codes. Each check is independently testable and read-only. |
| `packages/mcp-server/src/doctor/config-checks.ts` | Project/remote config/secret-reference/executable/version/tunnel-config validation by reusing MCP-021/025/026 validators; no duplicate schemas or child/network mutation. Add only if one file would be unmaintainable. |
| `packages/mcp-server/src/doctor/mcp-checks.ts` | Local/public negative auth probes, official MCP client initialize/discovery/read-only orientation/project/tool-policy/session-close checks, using injected protected token provider and canonical remote exposure set. |
| `packages/mcp-server/src/doctor/network-checks.ts` | Bounded configured-host-only DNS, TLS, HTTPS redirect/status checks with standard certificate verification and injectable resolvers/connectors for tests. No insecure success path or arbitrary scanner. |
| `packages/mcp-server/src/doctor/index.ts` | Orchestrate one report: normalize input, run checks in stable order with skips after failed prerequisites, aggregate status/exit, enforce cleanup/redaction, and expose library API to GUI-095/MCP-028. |
| `packages/mcp-server/src/doctor/render.ts` | Generate concise human output from the structured report only; no second evaluation path. Keep JSON output canonical and deterministic. |
| `packages/mcp-server/src/doctor-cli.mjs` | Local CLI for `config|local|public`, protected config/secret references, `--json`, cancellation, exits 0/1/2, stdout/stderr separation, and no raw token/arbitrary URL option. |
| `packages/mcp-server/src/doctor/doctor.test.ts` | Table-driven dependency/order/aggregation/exit/render/redaction tests plus injected layer failures and cleanup. Use the repo's canonical test naming if different. |
| `packages/mcp-server/src/doctor/doctor.integration.test.ts` | Real loopback authenticated MCP/disposable-board tests and local TLS fixtures for auth/init/project/tool/session/DNS-TLS-redirect behavior without public services. |
| `packages/mcp-server/src/doctor/fixtures/` | Test certificates/servers or generated-at-test helpers, fake secret provider, fake DNS/TLS, and intentionally faulty endpoints. Do not commit private production credentials; prefer generated ephemeral certificates. |
| `packages/mcp-server/src/smoke-doctor.mjs` | Built-output config/local smoke using disposable board, protected token, authenticated loopback host, fake tunnel status, JSON parse, exit codes, cleanup, and canary scan. |

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/server.ts` | Export/reuse canonical remote exposure policy/tool identifiers and read-only orientation tool contract so doctor does not duplicate the tool list. No doctor-specific handler branch. |
| `packages/mcp-server/src/http.ts` | Expose safe local status/session cleanup hooks needed by local doctor; preserve transport/auth behavior. |
| `packages/mcp-server/src/http-auth.ts` | Expose the protected token-provider interface/safe metadata needed by doctor; do not add token CLI argument or broaden reveal behavior. |
| `packages/mcp-server/src/tunnels/types.ts` | Expose normalized adapter status/diagnostic types to doctor without Cloudflare process internals. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` | Reuse executable/config validation as pure checks; do not start or mutate the tunnel from config-mode doctor. |
| `packages/mcp-server/package.json` | Add doctor bin/script/exports and test/smoke routing while preserving stdio default and remote-host commands. Add no general network-scanner dependency without necessity. |
| `package.json` | Wire canonical doctor tests/smoke into root test/verify exactly once. |
| `scripts/verify.mjs` | Confirm built local doctor smoke is part of the shared rail; real public mode remains MCP-028/manual environment. |
| `apps/gui/src/main/` remote process/settings modules | GUI-095 should call the doctor library/JSON CLI and render stable check ids. Modify only in GUI-095, not this ticket, unless an existing shared non-Electron interface requires a type export. |
| `docs/functional/frd/FRD-025-remote-access.md` | Consume accepted doctor requirement ids; change only through approved doc correction. |
| `docs/manual/` canonical remote manual | DOC-013 will map check ids/repairs to setup sections; do not write competing long-form instructions here. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/mcp-server/src/root.ts` | Resolve expected project/fingerprint safely. |
| `packages/mcp-server/src/http-config.ts` | Canonical remote config validation and local bind/status fields. |
| `packages/mcp-server/src/http-secret.ts` | Protected headless token source; doctor must not add another secret parser. |
| `packages/mcp-server/src/http-session-registry.ts` | Ephemeral doctor session close observation. |
| `packages/mcp-server/src/remote-host.ts` | Current local/tunnel combined status and generation ids. |
| `packages/mcp-server/src/errors.ts` | Coded redacted local errors. |
| `packages/mcp-server/src/logging.ts` or canonical logger | One redaction/structured diagnostics implementation. |
| `packages/mcp-server/src/smoke-http.mjs` | Reuse official MCP client/local host fixture helpers rather than duplicate protocol code. |
| `packages/mcp-server/src/smoke-remote.mjs` | Reuse fake-provider lifecycle/status fixture. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | No MCP doctor tool is added; confirm tool count/reference unchanged. |
| `.github/workflows/pr.yml` | Local/config tests only; no Cloudflare secret/public endpoint in PR CI. |
| MCP-028 docs | Final integration consumes `--json` report and actual check ids. |

## Exact report/check contract

Modes: `config`, `local`, `public`.

Statuses: `pass`, `warn`, `fail`, `skipped`; severities explicit.

Stable ordered ids:

- `PROJECT_CONFIG_VALID`
- `REMOTE_CONFIG_VALID`
- `SECRET_REFERENCE_VALID`
- `TUNNEL_EXECUTABLE_VALID`
- `TUNNEL_CONFIG_VALID`
- `LOCAL_STATUS_READY`
- `LOCAL_BIND_LOOPBACK`
- `AUTH_MISSING_REJECTED`
- `AUTH_WRONG_REJECTED`
- `AUTH_VALID_ACCEPTED`
- `MCP_INITIALIZE_LOCAL`
- `PROJECT_FINGERPRINT_LOCAL`
- `REMOTE_TOOL_POLICY_LOCAL`
- `SESSION_CLOSE_LOCAL`
- `TUNNEL_PROCESS_READY`
- `PUBLIC_DNS_RESOLVES`
- `PUBLIC_TLS_VALID`
- `PUBLIC_ROUTE_NO_REDIRECT`
- `AUTH_MISSING_PUBLIC_REJECTED`
- `MCP_INITIALIZE_PUBLIC`
- `PROJECT_FINGERPRINT_PUBLIC`
- `REMOTE_TOOL_POLICY_PUBLIC`
- `SESSION_CLOSE_PUBLIC`
- `LOCAL_PUBLIC_CONSISTENT`
- `DIAGNOSTIC_REDACTION`
- `NO_BOARD_MUTATION`

Exit: 0 healthy/warnings, 1 completed with required failure, 2 invalid invocation/internal inability to produce reliable report.

## Do not modify

- Add a remotely exposed doctor MCP tool.
- Accept arbitrary URLs, raw token argv/settings, or insecure TLS success.
- Auto-fix/start/stop/rotate/create tunnel/DNS/account resources.
- Call mutating board tools in normal doctor operation.
- Duplicate project/tool/auth/tunnel validators or protocol framing.
- Print secrets, full session ids, raw child output, document content, or unsafe paths.
- Follow cross-host redirects.
- Require public network/provider credentials in normal CI.
- Change stdio/tool surface or hand-edit plugin bytes.
