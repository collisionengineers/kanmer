# Research — MCP-021 `cloudflared` adapter

## Official behavior to verify at implementation

Re-check the current official Cloudflare Tunnel documentation and the installed `cloudflared` version for:

- named locally managed tunnel credentials/config format;
- `tunnel run` arguments and `--no-autoupdate` placement;
- loopback metrics listener and `/ready` semantics;
- JSON log fields for connection registration/disconnection;
- graceful signal behavior on Windows and POSIX;
- Quick Tunnel limitations, especially production support, concurrent requests, and Server-Sent Events.

Do not copy command lines from a different `cloudflared` release without confirming `cloudflared --version` and `--help` in tests/doctor.

## Supported first-release mode

Support a **named tunnel with an operator-provisioned Cloudflare hostname and credential reference**. Kanmer generates the local runtime ingress configuration but does not create the Cloudflare account, tunnel, DNS route, or hostname.

Preferred mode is a locally managed named tunnel:

- validated tunnel UUID/name;
- protected Cloudflare tunnel credentials JSON path;
- configured public hostname;
- generated runtime config mapping that hostname to the exact loopback Kanmer origin;
- terminal catch-all returning an HTTP error rather than forwarding arbitrary hostnames.

If the accepted implementation instead uses a remotely managed tunnel token, use Cloudflare's current documented token-file/secret-reference mechanism. Never put the tunnel token in command-line arguments or ordinary settings. Do not support two credential modes partially: expose each as a distinct validated discriminator with dedicated tests.

## Quick Tunnels

Quick Tunnels (`trycloudflare.com`) are documented as development/testing conveniences rather than production tunnels and have limitations that can conflict with long-lived Server-Sent Events used by full MCP Streamable HTTP behavior. Therefore:

- they are not an approved production/public remote-access mode;
- GUI-095 must not label them as secure/stable configured access;
- the adapter may omit them entirely in version 1;
- if retained only as an explicit developer diagnostic, mark the state `development-only`, prohibit persistence/auto-start, and do not use it for MCP-028 acceptance.

The implementation should prefer omission to a misleading partially compatible path.

## Runtime configuration

Generate provider configuration in an application runtime/temp directory outside the repository and board worktree. Use a real YAML serializer or another format explicitly accepted by the installed cloudflared parser; do not concatenate unescaped user input.

The effective ingress must be equivalent to:

```yaml
tunnel: <validated-tunnel-id>
credentials-file: <validated-protected-path>
ingress:
  - hostname: <validated-public-hostname>
    service: http://127.0.0.1:<validated-port>
  - service: http_status:404
```

Additional origin options must be an explicit allowlist. Do not permit arbitrary YAML fragments, custom commands, shell strings, wildcard hostnames, URL credentials, or request-header injection. The local service remains HTTP because it is loopback-only; public TLS terminates at the provider edge.

Set provider self-update off for an app-managed process. Do not change user-global cloudflared configuration or install a Windows service.

## Executable discovery and version

Discovery precedence:

1. explicit configured executable path;
2. app-bundled/installer-managed path only if a later packaging ticket establishes one;
3. approved PATH lookup.

Resolve to an absolute regular executable and record canonical path/version in local diagnostics. Run `cloudflared --version` and, where needed, `tunnel run --help` with a short timeout. Reject unparseable/unsupported versions with an actionable code. Do not auto-download or self-update in this ticket.

The supported minimum/version policy should be derived from the exact flags/metrics behavior used, documented in tests and DOC-013, and not guessed in advance.

## Credentials-file checks

The adapter does not parse or log credential JSON contents unless Cloudflare's documented format requires a minimal identifier consistency check. Validate:

- absolute/canonical regular file;
- no symlink where platform APIs allow reliable refusal;
- bounded size;
- POSIX group/world permissions rejected or warned according to accepted policy;
- Windows ACL limitations reported honestly;
- configured tunnel id agrees with safe non-secret metadata when it can be obtained without exposing account secrets.

Pass only the credentials-file path through generated config. Never copy credentials into the runtime config, logs, events, GUI state, board docs, or child arguments.

## Process arguments and environment

Construct an explicit argument array from the installed-version contract, conceptually:

```text
cloudflared tunnel --no-autoupdate --config <runtime-config> --logformat json --metrics <loopback-metrics> run <tunnel-id>
```

The exact ordering/flag spelling must be validated against the installed version. Never invoke a shell. Use an environment allowlist containing only platform essentials and any documented provider requirement; do not inherit Kanmer bearer credentials or arbitrary development variables.

Start from a neutral working directory. Prefix every captured event with adapter attempt id rather than altering provider output.

## Metrics and readiness

Configure the cloudflared metrics server on a dedicated loopback address/port. Never bind metrics publicly. Prefer the documented readiness endpoint and metrics over scraping prose:

- process started does not mean connected;
- readiness succeeds only when cloudflared has established the provider-side connection(s) according to its documented endpoint;
- readiness timeout causes a failed attempt and full cleanup;
- subsequent readiness/connection loss moves the adapter to degraded;
- recovery returns to connected without a new process when provider readiness recovers;
- process exit is recorded separately from readiness loss.

Because fixed metrics ports can collide, use a tested allocator/ownership strategy and retry a bounded number of bind conflicts. Do not scan broad port ranges indefinitely. Ensure only the child/adapter can claim the chosen endpoint as far as the platform allows.

The public URL is derived from the validated configured hostname (`https://<hostname>`), not scraped from logs.

## Redaction and log handling

Request JSON logs where supported, parse defensively, and map only allowlisted fields into normalized events. Bound line length, total retained lines, and rate. Redact:

- tunnel token/credentials content;
- credentials/config paths where local path exposure is restricted;
- account/tunnel identifiers according to diagnostics policy;
- URL user-info/query values;
- Kanmer bearer/header canaries inherited accidentally;
- arbitrary provider error payloads before GUI/export.

Keep a small redacted ring buffer for doctor/GUI. Full raw logs are not persisted by default.

## Shutdown and orphan prevention

On stop/parent exit/local-origin invalidation:

1. mark stopping and cancel restart timers;
2. stop health polling;
3. send the documented graceful termination signal to the owned child;
4. wait a bounded interval;
5. terminate the owned process tree forcefully if needed using the repository's cross-platform helper;
6. await exit and close streams;
7. remove runtime config and release metrics resources;
8. emit one stopped event with reason/exit code/signal;
9. verify no owned child remains.

Never kill an unrelated cloudflared process selected only by executable name.

## Test matrix

Use a fake cloudflared executable/script with controlled JSON logs/readiness endpoint and process behavior:

- executable missing/non-regular/version failure/help mismatch;
- valid config/argument order and no shell interpolation;
- hostname/tunnel id/origin/credentials validation;
- runtime config escaping and catch-all ingress;
- credentials canary absent from argv/config/events except provider-owned credential file reference;
- ready success, timeout, flapping, child exit, restart/backoff/jitter/exhaustion;
- intentional stop has no restart;
- origin PID/project/auth generation changes stop forwarding;
- oversized/malformed/malicious logs are bounded/redacted;
- metrics port collision and cleanup;
- Windows/POSIX graceful/forced process-tree shutdown;
- path with spaces and metacharacters remains one argument;
- Quick Tunnel configuration rejected/omitted;
- no real board, provider account, DNS, or public network in normal tests.

MCP-028 performs the real named-tunnel, public HTTPS, bearer, project, tool-policy, disconnect/reconnect, and shutdown proof.
