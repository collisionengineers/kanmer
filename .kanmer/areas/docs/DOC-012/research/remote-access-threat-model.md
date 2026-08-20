# Research — EPIC-010 remote-access threat model

## Protected assets

- Kanmer board data, ticket documents, group context, activity, and configuration.
- Mutating tool authority: ticket moves, document writes, links, take/release, project setup.
- Repository/board path and project fingerprint.
- Bearer credential and provider/tunnel credentials.
- Host process, child-process boundary, logs, and GUI configuration.
- Availability of the local listener and tunnel.

## Trust boundaries

1. Remote MCP client to public tunnel edge.
2. Tunnel provider/agent to loopback HTTP origin.
3. HTTP middleware to MCP SDK transport.
4. MCP transport to shared Kanmer tool registry.
5. Tool registry to board/store and Git process boundaries.
6. GUI to local server/tunnel child processes and secret storage.

TLS to the public client is terminated/managed by the chosen tunnel provider. The local origin is loopback-only. Bearer authentication remains mandatory even when the tunnel provider offers an access-control layer; provider access controls are defence in depth, not the Kanmer application identity contract.

## Threats and required mitigations

### Credential disclosure

Threats: token in URL/query, command line, process list, logs, clipboard history, crash report, GUI screenshots, exported config, or tunnel arguments.

Mitigations:

- Generate at least 32 random bytes and encode URL-safe.
- Accept only `Authorization: Bearer <token>`.
- Never accept query/cookie token.
- Pass secret to process through protected IPC/environment/stdin/secret file according to platform design, not command-line arguments.
- Store through OS credential storage where GUI-managed; otherwise require a protected environment/file reference.
- Show token only at creation/explicit rotate flow; redact by default.
- Log only a short non-reversible fingerprint.
- Constant-time compare normalized byte sequences of equal length.
- Rotate by replacing active secret and invalidating sessions.

### Unauthorized discovery or mutation

Threats: unauthenticated tool listing, leaked endpoint probing, weak token, endpoint exposed on LAN, remote dispatch.

Mitigations:

- Authenticate before MCP parsing/session creation and before all methods, including `GET`/`DELETE`.
- Loopback bind by default; explicit refusal for wildcard bind unless a future secure mode is approved.
- Rate/concurrency/body limits and generic unauthenticated responses.
- Keep existing stage/doc/expected-project gates for mutations.
- Exclude background dispatch tools in remote mode.
- One board per process; no path selection from request.

### DNS rebinding / origin abuse

Threats: malicious web page targets a local listener, spoofed forwarding headers, broad CORS.

Mitigations:

- Validate `Origin` against explicit allowlist where present.
- Reject non-allowlisted origins before auth/body processing.
- Do not enable wildcard CORS.
- Trust forwarded host/proto only from the configured local tunnel boundary and only where required.
- Bind loopback and document public hostname explicitly.

### Session hijacking/fixation

Threats: predictable session ids, session reused by another bearer, unlimited stale sessions.

Mitigations:

- Server-generated cryptographically random ids.
- Associate session with authenticated credential identity/fingerprint.
- Reject client-selected unknown session ids.
- Idle TTL, total cap, per-token cap, cleanup on delete/shutdown/rotation.
- Do not log full session ids; redact/fingerprint.

### Denial of service

Threats: oversized JSON, too many sessions/connections, slow requests, expensive tool calls, child process storms, rapid restart loop.

Mitigations:

- Bounded headers/body/request/idle durations.
- Session and concurrent-request caps.
- One in-flight mutation per session or the repository's defined serialization boundary where needed.
- Tunnel restart backoff/jitter and maximum attempts.
- Child-process ownership and shutdown timeout.
- Health status distinguishes local server, auth, tunnel, and client session without echoing secrets.

### Confused project / stale client

Threats: client connects to a different board than expected or reuses endpoint after project switch.

Mitigations:

- Capture immutable project fingerprint at listener startup.
- Expose it through orientation/ready data.
- Require `expected_project` on supported writes.
- Stop/restart remote listener on project change; do not hot-route to another board under the same URL.
- Connector doctor verifies expected project, remote URL, auth, protocol, and safe tool discovery.

### Command injection / tunnel compromise

Threats: provider config interpolated into shell, malicious executable path, untrusted URL/hostname, inherited environment, orphaned process.

Mitigations:

- Spawn executable with argument arrays and no shell.
- Validate adapter config types/hostnames/paths.
- Resolve approved executable explicitly and report version.
- Environment allowlist; secrets excluded from diagnostics.
- Capture PID/ownership, bounded output buffers, graceful then forced shutdown.
- Adapter cannot mutate board or register tools.

## Security logging

Log structured events: server start/stop, project fingerprint, bind address/port, auth success/failure aggregate, session create/close/expire, request/tool name/duration/result code, tunnel start/status/stop, rotation, and limit rejection. Never log token, full authorization header, document contents, prompts, complete session id, provider credential, or arbitrary request body.

Security logs should remain local in the first release and have bounded retention. GUI display is a redacted view.

## Secret rotation

Rotation is an explicit operation:

1. generate/store new token;
2. update server auth state atomically;
3. invalidate all existing sessions;
4. update displayed fingerprint and timestamp;
5. require clients to reconnect;
6. securely remove old stored reference where platform supports it;
7. record a redacted audit event.

No dual-token grace period in the first release unless implementation research proves a client update requires it.

## Security acceptance tests

- no token: 401 before MCP parsing;
- malformed/wrong/similar-length token: 401;
- valid token: initialize succeeds;
- token in query/cookie: ignored/rejected;
- present disallowed Origin: rejected;
- wildcard bind config: refused;
- session id cannot cross token identity;
- rotation invalidates current sessions;
- oversized body/session/concurrency caps enforced;
- logs/errors/process args contain no token/document content;
- remote discovery omits dispatch tools;
- wrong expected-project write fails;
- tunnel child config cannot inject shell commands;
- shutdown removes sessions and child process.

## Residual risk and deferred work

Bearer tokens are possession credentials and offer no per-user attribution. Tunnel providers and local host remain trusted. OAuth/OIDC, per-client scopes, revocation lists, managed relay, distributed sessions, and enterprise audit export are deferred explicitly rather than partially implemented.
