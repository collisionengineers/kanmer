# Research — MCP-021 provider-neutral tunnel adapter contract

## Purpose

The tunnel layer publishes an already healthy, authenticated loopback MCP origin. It does not implement MCP framing, bearer authentication, board selection, tool policy, or GUI state. Keeping this boundary narrow allows Cloudflare Tunnel to be replaced later without changing the HTTP server or Kanmer tools.

## Prerequisite contract

A tunnel may start only after MCP-025 and MCP-026 report a validated local origin with:

- loopback `http://127.0.0.1:<port>` or `http://[::1]:<port>` base URL;
- canonical `/mcp` endpoint;
- `authRequired: true`;
- one immutable project id/fingerprint;
- successful local health and authenticated MCP initialization using a test/client credential held by the parent, not the adapter;
- no wildcard/LAN listener.

The adapter receives the origin URL and redacted project/auth metadata. It never receives the Kanmer bearer token and cannot call or mutate the board.

## Generic interface

Use one provider-neutral interface with explicit lifecycle and events:

```ts
interface TunnelAdapter {
  readonly provider: string;
  validate(input: TunnelStartInput): Promise<TunnelDiagnostics>;
  start(input: TunnelStartInput, signal: AbortSignal): Promise<TunnelHandle>;
}

interface TunnelHandle {
  readonly publicUrl: URL;
  readonly status: TunnelStatus;
  subscribe(listener: (event: TunnelEvent) => void): () => void;
  getStatus(): TunnelStatusSnapshot;
  stop(reason: string): Promise<void>;
  waitForExit(): Promise<TunnelExit>;
}
```

`TunnelStartInput` contains only:

- validated loopback origin URL;
- expected public HTTPS hostname/URL;
- provider-specific validated configuration behind a discriminated type;
- opaque secret-file/credential reference, never credential bytes in generic logs;
- restart policy;
- structured event/log sink;
- project fingerprint for diagnostics only.

Normalized lifecycle states:

`stopped → validating → starting → connected → degraded → stopping → stopped`

`failed` is terminal for the current attempt. Events include timestamp, provider, generation/attempt, state transition, redacted code/message, child pid/version, public URL, and connection counts/health where available. They exclude secrets, authorization headers, document content, full provider credentials, and arbitrary child output.

## Validation

Validation occurs before any child process starts:

- origin scheme must be plain HTTP on exact loopback address and permitted port;
- public endpoint must be HTTPS with one valid non-wildcard hostname, no user-info, query, fragment, or unexpected path;
- provider configuration must match one supported mode exactly;
- executable must resolve to an explicit regular executable or approved PATH lookup and pass `--version` within the supported contract;
- provider credential/config references must be regular, non-symlinked/protected to platform capability;
- no value can add command arguments through shell interpolation;
- local HTTP host PID/readiness/project/auth state must still be current.

Validation returns a structured report with pass/warn/fail checks and actionable local repair instructions. It never invokes network changes or creates DNS records.

## Child-process safety

- Spawn executable directly with an argument array and `shell: false`.
- Use a minimal environment allowlist; provider secrets are supplied through documented file/descriptor mechanisms, not command-line text.
- Set an explicit working directory outside the repository/board worktree.
- Disable provider self-update when Kanmer owns the executable lifecycle.
- Capture stdout/stderr with bounded buffers and line length.
- Parse only documented structured/metrics signals for state; human logs remain diagnostic and are redacted.
- Track child PID/process ownership and ignore unrelated existing processes.
- Graceful stop first, then bounded forced process-tree termination using the repository's cross-platform process helper.
- Cleanup temporary provider config and metrics resources on startup failure, stop, parent exit, and test teardown.

## Readiness and health

Separate states:

- **local-ready**: authenticated loopback MCP host is healthy before tunnel start;
- **provider-connected**: tunnel process reports at least one healthy provider connection through a documented readiness/metrics signal;
- **public-verified**: connector doctor completes HTTPS/authenticated MCP initialization and project/tool-policy checks through the public URL.

The adapter itself may report `connected` after provider readiness. It must not claim end-to-end verified until MCP-027/MCP-028 supplies the public handshake result. A live child PID alone is never connected.

If the local origin dies or its project/auth generation changes, mark degraded and stop/restart the tunnel rather than forwarding to an unknown listener. If the provider child dies, keep the authenticated loopback server local while reporting degraded/failed.

## Restart policy

Use a bounded supervisor owned by the adapter/orchestrator:

- no restart after intentional stop, invalid configuration, auth/origin mismatch, unsupported executable, or deterministic provider error;
- transient unexpected exit may restart with exponential backoff and jitter;
- maximum attempts/window and maximum delay are validated configuration;
- a stable connected interval resets the consecutive-failure counter;
- every attempt has a new generation id and cleans previous resources first;
- no overlapping cloudflared processes for one tunnel configuration;
- after exhaustion, status is failed and operator action is required.

Recommended defaults for implementation review: base delay 1 second, doubling to at most 30 seconds, ±20% jitter, maximum 5 consecutive attempts, stable reset after 5 minutes. Tests inject clock/randomness; do not sleep in unit tests.

## Configuration and ownership

Ordinary settings contain provider id, mode, executable reference, public hostname, tunnel id, credential-store/file reference, and restart policy. They do not contain provider credential contents or Kanmer bearer token. GUI-095 owns persisted user settings/secret references; MCP-021 owns validation and process behavior.

The adapter must not write provider account/DNS configuration automatically in version 1. Setup is performed through provider tools/dashboard/manual, then validated locally. This avoids embedding account APIs/permissions in Kanmer and preserves provider interchangeability.

## Test strategy

- pure validation/argument/config/event/state-machine tests;
- fake provider executable for startup/readiness/degraded/exit/restart/shutdown and malicious output;
- fake local origin for readiness/project/auth generation changes;
- optional real `cloudflared --version`/local process smoke when available;
- real public tunnel, DNS, and remote MCP handshake only in MCP-028's controlled integration environment.

## Non-goals

- No tunnel account creation, DNS mutation, executable auto-download, provider OAuth, public relay, remote board routing, bearer handling, or background dispatch.
- No direct dependency from core or tool handlers on a tunnel provider.
