# Research — MCP-027 remote connector doctor

## Purpose

Remote-access failures can occur at distinct layers: Kanmer project selection, HTTP listener, bearer secret, session transport, tunnel process, provider routing, DNS/TLS, remote MCP negotiation, or tool policy. A useful doctor must identify the first failed boundary without mutating the board, exposing credentials, or reducing all failures to “cannot connect”.

The doctor is a **local CLI/library diagnostic**, not a remotely exposed MCP tool. It may use protected local configuration and secret providers, but it must never make arbitrary URL/network probes on behalf of a remote caller.

## Modes

Support three explicit modes using one ordered check registry:

1. `config` — no external network or child start. Validate project, settings, secret reference metadata, cloudflared executable/version, named-tunnel config, hostname, and local bind policy.
2. `local` — includes config plus current local remote-host status, negative/positive bearer tests, MCP initialize/tool discovery/project fingerprint, and session close against loopback.
3. `public` — includes local plus DNS/TLS/HTTPS and the same authenticated MCP checks through the configured public hostname.

A check not applicable to the selected mode is `skipped` with a reason. Do not silently omit it.

## Stable report contract

Return a deterministic schema-versioned report:

```json
{
  "kind": "kanmer-connector-doctor",
  "schema": 1,
  "mode": "public",
  "status": "pass",
  "startedAt": "...",
  "durationMs": 1234,
  "project": {
    "expectedFingerprint": "...",
    "observedFingerprint": "..."
  },
  "endpoint": {
    "hostname": "mcp.example.com"
  },
  "checks": [
    {
      "id": "AUTH_VALID_TOKEN",
      "status": "pass",
      "severity": "error",
      "summary": "...",
      "durationMs": 20,
      "details": {},
      "repair": null
    }
  ]
}
```

Statuses: `pass`, `warn`, `fail`, `skipped`. Severity is explicit (`error` or `warning`) and not inferred from prose. Overall failure occurs when any required/error check fails. Preserve check order and ids as an API consumed by GUI-095 and DOC-013.

CLI behavior:

- `--json`: report JSON alone on stdout; operational diagnostics on stderr;
- human mode: concise grouped summary generated from the same report, not a second evaluation path;
- exit `0`: all required checks pass (warnings allowed);
- exit `1`: doctor completed and found one or more required failures;
- exit `2`: invalid invocation/config prevented a reliable report or an internal doctor defect occurred.

## Ordered checks

Recommended stable ids and dependencies:

### Configuration

1. `PROJECT_CONFIG_VALID` — one board/project resolves and expected fingerprint is available.
2. `REMOTE_CONFIG_VALID` — remote/tunnel configuration schema and precedence are valid.
3. `SECRET_REFERENCE_VALID` — protected bearer secret/provider credential references are readable/valid to platform policy without exposing contents.
4. `TUNNEL_EXECUTABLE_VALID` — selected provider executable exists, is executable, and supports required version/flags.
5. `TUNNEL_CONFIG_VALID` — named tunnel id/hostname/credentials/origin policy is internally consistent.

### Local host

6. `LOCAL_STATUS_READY` — remote host reports expected loopback address, auth required, project/auth generation, and healthy state.
7. `LOCAL_BIND_LOOPBACK` — observed listener is not wildcard/LAN.
8. `AUTH_MISSING_REJECTED` — one request without credential returns the exact generic 401 challenge.
9. `AUTH_WRONG_REJECTED` — one synthetic same-shape wrong credential is rejected identically.
10. `AUTH_VALID_ACCEPTED` — protected real credential establishes MCP transport.
11. `MCP_INITIALIZE_LOCAL` — official client initialization/version negotiation succeeds.
12. `PROJECT_FINGERPRINT_LOCAL` — orientation/status matches configured expected project.
13. `REMOTE_TOOL_POLICY_LOCAL` — discovery equals the approved remote-safe set and omits background dispatch.
14. `SESSION_CLOSE_LOCAL` — client/transport closes and the ephemeral session disappears.

### Tunnel and public endpoint

15. `TUNNEL_PROCESS_READY` — owned adapter is connected through its documented readiness signal, not merely alive.
16. `PUBLIC_DNS_RESOLVES` — configured hostname resolves; report addresses/counts without treating address identity as provider ownership proof.
17. `PUBLIC_TLS_VALID` — standard certificate/hostname validation succeeds; report safe protocol/issuer/expiry metadata.
18. `PUBLIC_ROUTE_NO_REDIRECT` — endpoint does not redirect to another host/scheme/login page.
19. `AUTH_MISSING_PUBLIC_REJECTED` — public endpoint enforces the same 401 before MCP parsing.
20. `MCP_INITIALIZE_PUBLIC` — valid credential initializes through HTTPS with official client.
21. `PROJECT_FINGERPRINT_PUBLIC` — remote endpoint is the expected board/project.
22. `REMOTE_TOOL_POLICY_PUBLIC` — approved remote set only.
23. `SESSION_CLOSE_PUBLIC` — public diagnostic session closes cleanly.
24. `LOCAL_PUBLIC_CONSISTENT` — protocol/tool/project/auth generation results agree across local/public paths.

### Safety/cleanup

25. `DIAGNOSTIC_REDACTION` — report/log/error surfaces contain no canary/raw secret/full session id.
26. `NO_BOARD_MUTATION` — disposable/live pre/post board snapshot confirms the doctor used read-only tools only where that check is enabled in tests/integration.

Checks with prerequisites are explicitly skipped after a failed dependency, so the report remains complete without generating misleading secondary noise.

## Secret handling

The doctor needs the raw Kanmer bearer token only transiently to send the valid request. Obtain it through the same protected source abstraction as GUI-095/MCP-026:

- GUI-managed credential-store callback; or
- protected headless token file/inherited channel.

Never accept `--token`, URL token, or ordinary settings value. Keep the secret in the smallest scope, avoid string interpolation/logging, close clients, and clear mutable buffers best-effort. Generate the wrong-token probe independently at the same approximate length/format; never mutate the real stored token.

Provider credential contents are not needed for network diagnostics and must not be read into the report.

## Network safety

- Public checks target only the configured validated hostname from remote settings; an arbitrary URL flag is not accepted in normal mode.
- Require HTTPS and standard platform certificate verification. No `--insecure` production success path.
- Do not follow redirects automatically. Report redirect target in redacted/safe form only when same-host policy permits.
- Bound DNS/TCP/TLS/HTTP/MCP stages separately with abort signals and response/body/header limits.
- Do not trust forwarded headers or infer client IP.
- The public doctor performs at most one missing-auth and one valid-auth handshake, plus the explicitly documented wrong-token check where rate policy permits.

## MCP checks

Use the official SDK client Streamable HTTP transport, not custom JSON-RPC, for successful initialization/discovery/session lifecycle. Raw HTTP is appropriate only for negative header/status/redirect/body edges.

After initialization, call a canonical read-only orientation/status tool that returns project fingerprint/capabilities. Do not call mutating tools or infer project from URL. Compare tool names with the canonical remote exposure policy exported by MCP-025 rather than a duplicated handwritten list.

## Diagnostics and repair text

Each failed check provides:

- concise technical summary;
- structured safe observed/expected values;
- likely layer/owner (`kanmer`, `bearer`, `cloudflared`, `dns`, `tls`, `provider-route`, `mcp`, `project`, `tool-policy`);
- one or more ordered repair steps that reference stable settings/commands/manual sections;
- no raw provider prose, secret, board path when redaction policy excludes it, or speculative diagnosis presented as fact.

Keep repair text provider-neutral where possible and attach cloudflared-specific checks only to cloudflared failures.

## Test strategy

- pure check dependency/aggregation/report/human-render tests;
- injected fake DNS/TLS/fetch/clock/secret provider/remote host/tunnel status;
- real loopback MCP host with protected temp token and disposable board;
- local TLS fixture with test CA for success/failure/redirect/hostname/expiry behavior without public network;
- fake cloudflared adapter status;
- canary-secret scans across JSON, human output, stderr, thrown errors, event logs, and child diagnostics;
- MCP-028 runs the final real public named-tunnel doctor and archives its report.

## Non-goals

- No auto-repair, tunnel/account/DNS mutation, credential rotation, board write probe by default, OAuth login, insecure TLS bypass, public arbitrary URL scanner, remote MCP doctor tool, or background dispatch.
