# Plan — MCP-021: provider-neutral tunnel adapter with `cloudflared`

## Objective

Add a provider-neutral tunnel lifecycle around the already healthy MCP-025/026 loopback host, implement a named-tunnel `cloudflared` adapter with safe configuration/process supervision/readiness/redaction, and prove all behavior locally with a fake provider. Do not create provider resources, expose unauthenticated HTTP, pass bearer secrets to the adapter, or require a public Cloudflare account in normal verification.

## Starting state

- DOC-012 defines one-project Streamable HTTP behind mandatory bearer auth and an interchangeable tunnel boundary.
- MCP-025 supplies a loopback-only HTTP host and machine-readable lifecycle.
- MCP-026 supplies bearer verification and auth-generation/session invalidation.
- MCP-027/028 own connector doctor and final real public proof.
- GUI-095 later owns persisted settings, secret references, and controls.

## Required changes

### 1. Confirm accepted provider/runtime contract

1. Read the accepted remote-access FRD/ADR and record actual paths/requirement ids.
2. Read MCP-025/026 implementation, tests, ready/stopped events, origin/project/auth-generation identifiers, and shutdown APIs.
3. Re-check current official Cloudflare documentation for named locally managed tunnels, credentials/config, `tunnel run`, `--no-autoupdate`, JSON logs, metrics/readiness, and signal behavior.
4. Run the target `cloudflared --version` and relevant `--help` in a disposable/manual environment; record exact supported syntax.
5. Re-check current Quick Tunnel limitations and confirm it remains excluded from v1 production.
6. Inspect existing cross-platform child-process/app-data/temp-file/logging helpers in MCP server and GUI without creating an Electron dependency.
7. Inspect packaging/release files to confirm this ticket does not silently promise a bundled executable.
8. Stop and update the ticket if the official mode cannot map one exact hostname to the authenticated loopback origin without exposing credentials in argv.

### 2. Define generic tunnel types

9. Add discriminated `TunnelProviderConfig` and provider-neutral `TunnelStartInput`.
10. Add exact normalized statuses `stopped`, `validating`, `starting`, `connected`, `degraded`, `stopping`, `failed`.
11. Add immutable status snapshot with provider, attempt/generation, timestamps, public URL, child PID/version, readiness dimension, redacted code/message, restart metadata, and project/origin generation.
12. Add structured event union for validation, transition, provider readiness, process exit, restart scheduled/cancelled/exhausted, log diagnostic, and cleanup.
13. Add `TunnelAdapter` and `TunnelHandle` interfaces with validate/start/status/subscribe/stop/wait.
14. Add validated restart-policy type and defaults.
15. Add opaque provider credential reference type that cannot contain arbitrary secret bytes.
16. Ensure generic types contain no Cloudflare-only field outside the discriminated config branch.
17. Ensure default serialization excludes arbitrary child output and credential references where path redaction applies.

### 3. Validate generic start input

18. Parse origin with `URL` and require `http:`.
19. Require exact loopback hostname/IP (`127.0.0.1` or accepted `::1`) and valid explicit port.
20. Reject wildcard/LAN/hostname/user-info/query/fragment and non-canonical origin values.
21. Require local origin ready record with `authRequired: true`, project fingerprint, HTTP PID/generation, and healthy state.
22. Validate public URL/hostname as HTTPS, no user-info/query/fragment, no wildcard, no IP literal unless explicitly approved, and no unexpected path.
23. Normalize hostname through the platform's URL/IDNA behavior and retain canonical lowercase ASCII value.
24. Require exactly one supported provider mode and reject unknown fields where schema conventions allow.
25. Validate restart delays/attempts/window/stable-reset bounds.
26. Return all validation checks deterministically without spawning a child.
27. Add tests for every accepted/rejected origin, hostname, project/auth state, config discriminator, and restart boundary.

### 4. Validate/discover `cloudflared`

28. Implement executable precedence: explicit path, approved app-managed path if present, then controlled PATH lookup.
29. Resolve to absolute canonical regular executable and reject directory/symlink policy violations according to existing process conventions.
30. Invoke `--version` with direct args, neutral cwd, minimal environment, bounded output/time.
31. Parse a documented version string defensively and retain raw version only in bounded redacted diagnostics.
32. Check the exact required `tunnel run`/metrics/log flags against a supported minimum/version contract derived from official behavior.
33. Return actionable missing/unexecutable/timeout/unsupported-version/help-mismatch codes.
34. Do not run update, login, tunnel create, DNS route, service install, or network mutation during validation.
35. Cache version validation only for the same canonical executable identity/mtime where safe; invalidate on path/file change.
36. Add fake-executable tests for every exit/output/timeout/path-with-spaces/version case.

### 5. Validate Cloudflare named-tunnel configuration

37. Define one exact v1 mode for operator-provisioned named tunnel.
38. Validate tunnel id/name using the official selected mode; prefer UUID where locally managed credentials require it.
39. Validate credentials reference as an absolute regular bounded file and reject symlinks where supported.
40. Apply POSIX mode/ownership policy and honest Windows limitations consistent with MCP-026 secret-file handling.
41. Avoid reading/logging credential contents; parse only minimal non-secret identifier consistency if the official format and accepted policy require it.
42. Require configured public hostname to match the hostname used in ingress.
43. Reject arbitrary origin options, YAML fragments, additional ingress rules, wildcard hostname, URL credentials, shell strings, and unknown provider secrets.
44. If a remotely managed token mode is supported, define it separately and require the current official token-file mechanism; never share partial validation with local credentials mode.
45. Add pure tests for valid/invalid ids, hostnames, files, mode discriminators, and secret canary redaction.

### 6. Generate protected runtime ingress configuration

46. Create a unique protected runtime directory outside repository/board worktrees.
47. Use the repository's safe app-data/temp convention and record ownership for cleanup.
48. Serialize provider config with a real YAML serializer or another format explicitly accepted by the tested cloudflared version.
49. Write exactly one ingress rule from canonical public hostname to exact loopback origin.
50. Add terminal `service: http_status:404` catch-all.
51. Include only allowlisted tunnel id/credentials path/log/metrics/origin options.
52. Never copy credential content or Kanmer bearer/verifier into runtime config.
53. Create the config exclusively with protected permissions and no overwrite.
54. Read back/parse the generated config in tests and assert exact semantic structure/order.
55. Reject newline/control/metacharacter values before serialization even though no shell is used.
56. Remove config/runtime directory after every failed start, intentional stop, exhausted restart, and test teardown.
57. Add tests for paths/hostnames with spaces and metacharacters proving values remain data, not extra rules/args.

### 7. Allocate loopback metrics/readiness endpoint

58. Select a loopback-only metrics host.
59. Use an existing safe port allocator/reservation helper if present; otherwise implement a bounded allocator with explicit ownership/race handling.
60. Never pass wildcard/public metrics address.
61. Reserve/retry only a small bounded number of bind collisions.
62. Configure the exact documented cloudflared metrics flag/endpoint.
63. Poll the official readiness endpoint with bounded timeout, interval, request size, and abort signal.
64. Treat child exit, malformed response, timeout, or repeated readiness failure as attempt failure.
65. Move connected only after provider readiness succeeds.
66. Continue low-frequency health polling while connected; move degraded on loss and connected on recovery where the same process remains valid.
67. Release allocator/poller/socket resources idempotently.
68. Add fake readiness tests for success, timeout, malformed, flap/recovery, child-before-ready, collision, abort, and cleanup.

### 8. Build safe child arguments/environment

69. Construct an explicit argument array matching the tested cloudflared release, including no-autoupdate, config path, JSON log format where supported, loopback metrics endpoint, run, and tunnel id.
70. Assert no argument contains raw provider credential content or Kanmer bearer content.
71. Pass credential/config **paths** only through documented flags/config.
72. Spawn with `shell: false`, hidden/no console window according to platform convention, neutral cwd, and detached/process-group behavior required for owned-tree shutdown.
73. Build a minimal environment allowlist containing only platform essentials and documented cloudflared variables.
74. Explicitly omit Kanmer bearer/raw token/verifier, development loaders, `NODE_PATH`, arbitrary inherited secrets, and unrelated provider tokens.
75. Set no-autoupdate so the supervised executable cannot mutate itself.
76. Capture PID/start time/executable/version/attempt generation before processing output.
77. Add tests that inspect exact argv/environment/cwd/options with canaries and injection strings.

### 9. Parse and redact provider output

78. Request structured JSON log output where supported.
79. Implement bounded line splitting with maximum line and total ring-buffer size.
80. Parse JSON defensively; malformed lines become bounded redacted diagnostics and never crash the adapter.
81. Map only allowlisted provider fields/codes into normalized events.
82. Do not use human log text as the primary readiness signal.
83. Apply the canonical redactor to authorization-like strings, credential/token canaries, sensitive paths/ids, URL user-info/query, and arbitrary provider payloads.
84. Rate-limit/coalesce repeated identical diagnostics.
85. Keep a small in-memory redacted ring buffer for GUI/doctor; do not persist raw logs by default.
86. Close/drain streams on exit and bound any final partial line.
87. Add malicious/oversized/multiline/secret-bearing output tests and scan every event/status/error buffer for canaries.

### 10. Implement one adapter attempt lifecycle

88. Transition stopped→validating before provider-specific checks.
89. On validation failure, emit deterministic checks and terminal failed state without child/config residue.
90. Generate runtime config/metrics resources and transition starting.
91. Spawn exactly one owned child and attach exit/error/output listeners before readiness polling.
92. If spawn fails, clean all resources and return failed attempt.
93. If readiness succeeds, transition connected with configured public URL and child/version metadata.
94. If readiness is lost while child runs, transition degraded; recover when readiness returns within policy.
95. If child exits, capture code/signal/classification and clean streams/config/metrics.
96. Distinguish intentional stop, configuration/security failure, transient process/provider failure, and parent/origin invalidation.
97. Make stop idempotent from every state.
98. Make wait resolve exactly once with normalized exit.
99. Ensure no state event occurs after terminal cleanup except the final stopped/failed event.
100. Add state-machine sequence tests for every path.

### 11. Implement bounded restart supervisor

101. Wrap attempts in one provider-neutral supervisor generation.
102. Guarantee at most one active child/attempt.
103. Apply default base/max delay, jitter, attempt cap, and stable-reset values from `open-questions.md`.
104. Inject clock/random/scheduler for unit tests.
105. Restart only classified transient unexpected failures.
106. Never restart after intentional stop, invalid config, unsupported executable, credential/origin/auth/project mismatch, or explicit cancellation.
107. Record attempt number, scheduled delay, failure code, and remaining attempts in redacted events/status.
108. Cancel timers on stop/config generation change/parent exit.
109. Reset consecutive failures only after the stable connected interval.
110. On exhaustion, transition failed and require operator action.
111. Prevent stale attempt events from changing a newer generation.
112. Add fake-clock tests for exponential values, jitter bounds, cap, stable reset, cancellation, overlap prevention, stale callbacks, and exhaustion.

### 12. Compose authenticated local host and tunnel

113. Add/reuse a remote-host orchestrator outside tool handlers/core.
114. Start/resolve MCP-025/026 HTTP origin first.
115. Verify local ready state, auth required, project fingerprint, and local authenticated MCP handshake before tunnel start.
116. Pass only loopback origin and non-secret generation/project metadata to adapter.
117. Start tunnel and combine health dimensions: local host, auth generation, provider process/readiness, public verification (initially unknown).
118. Monitor HTTP process/listener/project/auth generation.
119. On origin death/change/mismatch, stop tunnel immediately and mark degraded/failed before any restart.
120. On tunnel failure, keep authenticated local host running unless operator stop/config policy says otherwise.
121. On parent/GUI stop, stop accepting requests, close HTTP sessions/listener, then stop the tunnel child and finalize redacted diagnostics, as required by FRD-025 RA-TUNNEL-6.
122. Make combined shutdown idempotent and bounded.
123. Emit one machine-readable remote-ready/status/stopped stream without secrets.
124. Do not start tunnel from stdio entry or local HTTP CLI by default.

### 13. Fake-provider and local integration tests

125. Implement a test-only fake cloudflared executable supporting version/help, JSON output, readiness server, delay, flap, exit code/signal, hang, ignored graceful signal, malicious output, and child spawn behavior if process-tree tests need it.
126. Never contact public DNS/Cloudflare from normal tests.
127. Test local-origin/auth failure prevents provider spawn.
128. Test valid local authenticated origin starts fake provider and reaches connected.
129. Test exact public URL/status and separate unverified public state.
130. Test local project/auth generation change stops forwarding and suppresses unsafe restart.
131. Test provider crash restart, backoff, stable reset, and exhaustion while local host remains.
132. Test intentional stop suppresses restart and removes all resources.
133. Test graceful and forced process-tree shutdown on Windows/POSIX supported runners.
134. Test path with spaces/metacharacters in executable/config/credential reference remains safe.
135. Test metrics collision/readiness timeout/flap/malformed response.
136. Test config contains exact ingress/catch-all and no canary secrets.
137. Test argv/environment/status/events/log ring/errors/runtime files/board files for bearer and provider credential canaries.
138. Test Quick Tunnel mode is absent/rejected.
139. Test no request/tool/board mutation occurs in adapter code.

### 14. Packaged smoke and optional real executable validation

140. Add a built remote-host smoke using fake provider and disposable board/token.
141. Assert machine-readable local-ready, tunnel-starting, connected, degraded/stop events.
142. Complete an authenticated local MCP initialize/safe read before provider start.
143. Terminate parent and assert no fake child/config/metrics artifact remains.
144. Run an optional `cloudflared --version`/help/config-parse smoke only when an explicit test executable path is supplied.
145. Skip optional real-binary smoke with a clear reason in normal CI; do not silently pass a public tunnel scenario.
146. Leave real named tunnel/public HTTPS/auth/project/tool-policy proof to MCP-028.

### 15. Documentation, packaging, and verification

147. Update CLI/config schema/help with provider-neutral fields and cloudflared v1 requirements, without embedding account-setup secrets.
148. Expose normalized diagnostic codes for MCP-027 and status contract for GUI-095.
149. Link accepted FRD/ADR and DOC-013 follow-up; do not create a competing long-form manual.
150. Decide no executable download/bundle change unless a separately approved packaging requirement exists.
151. Confirm no MCP tool/schema/count/reference change.
152. Run tunnel/supervisor/remote-host unit and integration tests.
153. Run local HTTP/auth/protocol/discovery smokes.
154. Run root test/typecheck/build/verify on Windows and primary CI platform.
155. If shared source unexpectedly changes stdio bundle, use canonical main-checkout plugin build/check and prove provider registration unchanged.
156. Run `git diff --check`; inspect status, process table, temp/runtime directories, and board for residue.
157. Record official version/flags selected, config schema, argv/environment proof, readiness/restart/shutdown traces, canary scan, optional-real-binary status, and deferred real-public test in the post-implementation report.

## Expected files

Add/modify only the adapter types, cloudflared config/process implementation, generic supervisor, remote-host composition, fake provider, tests/smokes, package routing, and accepted documentation references listed in `files.md`. Reuse existing process/log/temp helpers where they already satisfy the contract.

## Acceptance checks

- One provider-neutral interface has one tested cloudflared named-tunnel implementation.
- Tunnel never starts before authenticated loopback/project readiness.
- Adapter never receives Kanmer bearer material or board authority.
- Public hostname/origin/credentials/executable/config are strictly validated.
- Runtime ingress is exact and ends in a 404 catch-all.
- Child uses direct args, minimal env, no self-update, bounded structured logs, loopback readiness, owned-process shutdown.
- Connected is based on provider readiness; public verification remains separately unknown until doctor/integration.
- Restart is bounded, deterministic in tests, and suppressed for intentional/security/configuration failures.
- Quick Tunnel is not a production mode.
- Normal CI uses no Cloudflare account/network and leaves no child/temp residue.
- Stdio, MCP tools, bearer/project gates, and plugin behavior remain unchanged.

## Verification commands

Use exact repository commands, including equivalents of:

```bash
npm test
npm run typecheck
npm run build
node packages/mcp-server/src/smoke-http.mjs
node packages/mcp-server/src/smoke-remote.mjs
npm run verify
git diff --check
git status --short
```

Optionally run the documented real-binary version/help/config smoke with an explicitly supplied cloudflared path. Do not run a public tunnel in normal PR verification.

## Failure and deviation rules

- Stop if MCP-025/026 local readiness/auth boundary is absent or ambiguous.
- Stop if the current cloudflared release lacks the documented safe credentials/config/readiness mechanism; update DOC-012/ticket rather than scrape prose or expose secrets.
- Do not add provider account/DNS APIs, executable download/update, Quick Tunnel production, raw token args, public metrics, shell execution, unrelated process killing, core/tool coupling, remote dispatch, or public integration credentials to CI.
- Do not merge; hand off to independent process/security review.

## Stop condition

Stop when the built remote host starts a fake/tested cloudflared named-tunnel adapter only after authenticated one-project loopback readiness, reaches provider-connected through documented loopback readiness, reports bounded redacted lifecycle, restarts only under the exact transient policy, stops without orphan/config residue, preserves stdio/tools/security boundaries, passes cross-platform local verification, and is ready for review. Do not perform the final public-tunnel acceptance or merge.
