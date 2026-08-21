# Plan — MCP-027: layered remote connector doctor

## Objective

Implement one local, read-only, schema-versioned diagnostic that explains remote-access failures layer by layer—from project/config/secret/executable through local bearer/MCP, tunnel readiness, public DNS/TLS/route, project/tool consistency, and cleanup—without exposing credentials, mutating the board, following insecure paths, or adding a remotely callable scanner.

## Starting state

- MCP-025 provides authenticated-capable loopback Streamable HTTP and canonical remote tool exposure.
- MCP-026 provides protected bearer-secret sources, authorizer metadata, and session lifecycle.
- MCP-021 provides normalized tunnel validation/status and cloudflared diagnostics.
- GUI-095/DOC-013/MCP-028 need stable doctor ids, output, repair guidance, and final public evidence.

## Required changes

### 1. Freeze the report and check registry

1. Read accepted FRD/ADR and predecessor implementation/report files; record actual paths and API names.
2. Create exact mode enum `config|local|public`.
3. Create exact check status enum `pass|warn|fail|skipped` and explicit severity enum.
4. Create schema-v1 report/result/safe details/repair types.
5. Define all 26 check ids and their stable order from `files.md`.
6. Define prerequisite ids and applicable modes for every check.
7. Define overall status aggregation and exits 0/1/2.
8. Define report timestamps/durations using injected monotonic time plus ISO wall-clock metadata.
9. Define deterministic safe JSON serialization and field ordering where snapshots depend on it.
10. Ensure no result type can contain raw secret/provider credential/full session/body/document fields.
11. Add tests for registry uniqueness/order, prerequisite acyclicity, mode coverage, aggregation, and exits.

### 2. Define injected diagnostic dependencies

12. Define interfaces for project resolver, remote config loader, bearer secret provider, tunnel validator/status provider, DNS resolver, TLS connector, raw HTTP probe, official MCP client factory, clock/abort controller, logger/redactor, and board mutation snapshot used only by tests/integration.
13. Production dependencies must wrap canonical MCP-021/025/026 modules; do not copy their schemas/logic.
14. Test dependencies must be deterministic and local.
15. Ensure every opened client/socket/process/secret handle has a registered cleanup action.
16. Add one cleanup stack that runs in reverse order on pass, failure, cancellation, and internal exception.
17. Bound each check and the overall report with configured timeouts/abort signals.
18. Translate dependency exceptions into coded safe check failures or exit 2 only when a reliable report cannot continue.

### 3. Implement check execution engine

19. Validate invocation/mode/config source before running checks.
20. Run checks in the stable registry order.
21. Before a check, inspect prerequisite results.
22. If a required prerequisite failed/skipped, emit a `skipped` entry naming the prerequisite and do not call the check dependency.
23. Run applicable independent checks even after another layer fails so the report remains useful.
24. Capture per-check duration and safe structured expected/observed details.
25. Preserve warnings independently of overall pass/fail.
26. Never stop on first ordinary check failure.
27. On cancellation, stop new checks, clean resources, and produce the canonical aborted/internal result according to invocation context.
28. Always append safety/cleanup checks where meaningful without claiming redaction proof from uninspected surfaces.
29. Add engine tests for multiple failures, skips, warning-only, cancellation, timeout, thrown dependency, cleanup, and deterministic order.

### 4. Implement configuration checks by composition

30. `PROJECT_CONFIG_VALID`: resolve exactly one project/board and full expected fingerprint through canonical root logic.
31. `REMOTE_CONFIG_VALID`: invoke canonical HTTP/remote-host configuration validator; report conflicts/invalid loopback/public hostname/mode safely.
32. `SECRET_REFERENCE_VALID`: invoke MCP-026 protected secret-source metadata validation without exposing token; do not retrieve the raw token yet in config mode.
33. `TUNNEL_EXECUTABLE_VALID`: invoke MCP-021 pure executable/version/help validator without starting it.
34. `TUNNEL_CONFIG_VALID`: invoke MCP-021 named-tunnel/hostname/credential-reference/ingress validation without creating provider resources.
35. Map canonical error codes to stable layer and repair references; preserve original code in a safe field.
36. Add table-driven pass/warn/fail tests and prove config mode performs no network/child/board operation.

### 5. Inspect current local remote-host state

37. `LOCAL_STATUS_READY`: query the local parent/library status using a bounded trusted local channel.
38. Validate process/listener healthy, expected project fingerprint, `authRequired:true`, current auth generation, and no stopping/degraded local state.
39. `LOCAL_BIND_LOOPBACK`: compare observed bound address/port with canonical loopback rules; do not infer from configured value alone.
40. Treat absent stopped host as an actionable failure in local/public mode, not an attempt to start it automatically.
41. Capture only safe PID/host/port/generation/version metadata.
42. Add fixtures for absent, stale PID, wrong project, auth disabled, wildcard/LAN, stopping, and healthy.

### 6. Implement negative bearer probes

43. Build a raw HTTP probe limited to the configured local/public `/mcp` endpoint.
44. Send one bounded request without authorization and assert exact generic 401 plus challenge.
45. Generate an independent cryptographically random wrong token of the permitted shape/length.
46. Send one bounded wrong-token request and assert the same status/challenge/body class without session creation.
47. Do not send malformed/large bodies or repeated guesses in production doctor.
48. Never log/store either wrong or real token.
49. Confirm negative probes do not refresh/create a session through local status/test instrumentation where available.
50. Implement separate local/public check ids reusing one helper.
51. Add tests for unexpected 2xx/3xx/404/500, missing/different challenge, redirect, timeout, and redaction.

### 7. Retrieve valid credential minimally

52. Retrieve the raw bearer only when `AUTH_VALID_ACCEPTED`/public MCP checks are about to run.
53. Use MCP-026's protected secret-provider callback; prohibit CLI/raw settings/URL sources.
54. Keep the value within one scoped client credential object and never include it in report/dependency errors.
55. Register cleanup/zeroization best-effort immediately.
56. If retrieval fails, fail the valid-auth check with the canonical secret-reference code and skip dependent MCP checks.
57. Do not read Cloudflare credential contents.
58. Add canary tests for retrieval success/failure/throw/cancel and all outputs.

### 8. Implement successful MCP local checks

59. Construct the official SDK Streamable HTTP client transport for the loopback endpoint with the protected bearer header.
60. `AUTH_VALID_ACCEPTED`: require successful transport connection/auth boundary; retain no session id in report.
61. `MCP_INITIALIZE_LOCAL`: complete normal MCP initialization/protocol negotiation within timeout.
62. Call the canonical read-only orientation/status tool once.
63. `PROJECT_FINGERPRINT_LOCAL`: compare full observed expected fingerprint and safe project id/version metadata.
64. `REMOTE_TOOL_POLICY_LOCAL`: list tools and compare exact sorted names/schemas or canonical policy signature with the exported `remote-http-v1` set; assert dispatch ids absent.
65. `SESSION_CLOSE_LOCAL`: close official client/transport, await DELETE/registry cleanup where supported, and assert no lingering diagnostic session through test/status hook.
66. Make close/cleanup idempotent after partial initialization.
67. Add real loopback disposable-board tests for pass, wrong project, tool drift, protocol mismatch, timeout, server close, and session leak.

### 9. Implement tunnel process readiness check

68. Read MCP-021 normalized current adapter status through trusted local state.
69. Require matching provider/config generation/public hostname/origin project/auth generation.
70. Require documented provider readiness state `connected`, not child PID alone.
71. Report degraded/starting/restart scheduled/exhausted/failed with exact safe code/attempt and repair.
72. Do not start/stop/restart cloudflared from doctor.
73. Add fixtures for every normalized state, stale generation, wrong hostname, and child alive but not ready.

### 10. Implement public DNS/TLS/route checks

74. Use only the canonical configured public HTTPS hostname; reject arbitrary invocation URL and any path/user-info/query/fragment drift.
75. `PUBLIC_DNS_RESOLVES`: resolve A/AAAA through injected/system resolver with timeout; report safe address families/counts, not a claim of Cloudflare ownership.
76. `PUBLIC_TLS_VALID`: perform standard hostname/certificate verification using the platform trust store; capture safe protocol, issuer label, SAN-match result, and expiry/remaining days.
77. Treat hostname mismatch, untrusted/expired/not-yet-valid certificate, handshake failure, and weak/unsupported protocol as failures according to accepted platform defaults.
78. Do not expose an insecure bypass that returns pass.
79. `PUBLIC_ROUTE_NO_REDIRECT`: make one bounded HTTPS request to `/mcp` without following redirects; fail 3xx/login/HTML intermediary responses and report safe same-host target metadata only.
80. Bound DNS/TCP/TLS/header/body stages and abort/close sockets.
81. Add local TLS fixtures for trusted/untrusted CA, correct/wrong hostname, expired/not-yet-valid where feasible, redirect cross-host/same-host, HTML login, timeout, oversized response, and cleanup.

### 11. Implement successful public MCP checks

82. Run the public missing-auth check before obtaining/using valid credentials where ordering permits.
83. Construct official SDK client for exact configured HTTPS `/mcp` endpoint and valid bearer.
84. `MCP_INITIALIZE_PUBLIC`: initialize with standard TLS and no redirect/insecure flags.
85. Call the same canonical read-only orientation/status tool.
86. `PROJECT_FINGERPRINT_PUBLIC`: compare full expected fingerprint.
87. `REMOTE_TOOL_POLICY_PUBLIC`: compare exact canonical remote exposure set and dispatch exclusion.
88. `SESSION_CLOSE_PUBLIC`: close and ensure transport terminates cleanly; never report full session id.
89. `LOCAL_PUBLIC_CONSISTENT`: compare protocol/version, project fingerprint, remote tool policy signature, and auth-generation metadata available safely; fail route-to-wrong-instance/drift.
90. Add injected/public-local fixture tests and leave real provider acceptance to MCP-028.

### 12. Prove redaction and no mutation

91. Add a unique canary token/provider credential/session id/path/document phrase to test fixtures.
92. Collect JSON report, human output, stderr logs, thrown errors, dependency diagnostics, cleanup failures, child status, and snapshots.
93. `DIAGNOSTIC_REDACTION` passes only in test/integration modes where those surfaces were actually scanned; in production report, represent the code's configured redaction self-check/metadata honestly rather than claiming impossible runtime omniscience.
94. Scan for raw and encoded/common-prefixed variants as defined by canonical redactor tests.
95. `NO_BOARD_MUTATION`: in disposable integration, hash/snapshot board before/after and assert only read-only MCP calls occurred.
96. In ordinary production doctor, mark no-mutation based on the fixed check/tool registry and report it as a structural pass only if implementation can guarantee no mutator is referenced.
97. Add a test that attempts to register/call a mutating probe and fails validation/build.

### 13. Add repair mapping and human renderer

98. Define one stable repair catalog keyed by check/error code and provider.
99. Each repair contains ordered concise actions and DOC-013 section anchors, not secrets or speculative claims.
100. Render human output from report checks grouped as Configuration, Local MCP, Tunnel, Public endpoint, Safety.
101. Show pass/warn/fail/skipped counts, first blocking layer, and next repair without hiding later independent failures.
102. Keep terminal formatting optional/no ANSI in non-TTY/JSON mode.
103. Test snapshots for healthy, warning, multi-failure, prerequisite skips, provider failure, wrong project, and narrow terminals.
104. Ensure JSON stdout has no prose/ANSI and stderr has no report duplication.

### 14. CLI and process behavior

105. Add explicit mode argument/default documented by accepted CLI convention.
106. Add `--json`; default human output may be retained for operators.
107. Accept project/remote configuration references through canonical settings/root arguments, not arbitrary endpoint/token.
108. Reject `--token`, `--url`, insecure TLS, auto-fix, or provider mutation flags.
109. Handle SIGINT/SIGTERM with abort/cleanup and correct exit.
110. Exit 0/1/2 exactly from the canonical report/invocation result.
111. In JSON mode write exactly one report to stdout; write only bounded operational errors to stderr.
112. Add child CLI tests for args, exits, cancellation, stdout/stderr, canary redaction, and cwd/path spaces.

### 15. Packaged smoke and integration handoff

113. Build a disposable board, protected temp token, real local HTTP host, and fake tunnel status.
114. Run `doctor config --json` and assert all expected configuration checks/results.
115. Run `doctor local --json`, including missing/wrong/valid auth, initialize, fingerprint, tool policy, close, no mutation.
116. Run an intentionally broken fixture and assert exit 1 plus exact failed/skipped check ids.
117. Run invalid invocation and assert exit 2 with no secret.
118. Parse report through the exported library and human renderer.
119. Assert cleanup of sessions/sockets/temp secret/board fixture.
120. Expose the exact `public --json` command/report contract for MCP-028; do not require a real public endpoint in PR CI.

### 16. Documentation and verification

121. Update package scripts/CLI help with modes, safe config references, exits, and redaction.
122. Export stable report/check types for GUI-095 and MCP-028.
123. Update accepted FRD only through approved correction; give DOC-013 exact check ids/repair anchors.
124. Confirm no MCP tool/reference/count/plugin change.
125. Run doctor unit/integration/built smoke.
126. Run HTTP/auth/tunnel/protocol/discovery regressions.
127. Run root test/typecheck/build/verify on Windows and primary CI platform.
128. Run `git diff --check`; inspect processes/sockets/temp/board for residue.
129. Record check matrix, exits, local pass/failure reports, TLS fixtures, canary scan, no-mutation proof, and deferred public command in the post-implementation report.

## Expected files

Add/modify only the canonical doctor library/check modules, local CLI, tests/fixtures/smoke, package routing, and narrow shared exports listed in `files.md`. Do not add a remote tool or duplicate transport/auth/tunnel logic.

## Acceptance checks

- One ordered schema-v1 report covers all 26 checks and three modes.
- Failed prerequisites produce explicit skips while independent checks continue.
- JSON/human output share one evaluation and exits 0/1/2 are exact.
- Valid secret is obtained only through protected provider and never serialized.
- Local/public successful MCP checks use the official client and read-only orientation/tool discovery.
- Public checks enforce configured host, HTTPS, standard TLS, no redirects, and bounded resources.
- Project fingerprint and exact remote tool policy are verified locally/publicly.
- Diagnostic sessions close; test board does not change.
- All output/error/log surfaces pass canary redaction tests.
- Normal CI needs no public tunnel/provider credential and leaves no residue.

## Verification commands

Use exact repository scripts, including equivalents of:

```bash
npm test
npm run typecheck
npm run build
node packages/mcp-server/src/smoke-doctor.mjs
node packages/mcp-server/src/smoke-http.mjs
node packages/mcp-server/src/smoke-remote.mjs
npm run verify
git diff --check
git status --short
```

MCP-028 later runs the packaged `public --json` command against a controlled named tunnel.

## Failure and deviation rules

- Stop if predecessor modules do not expose canonical validators/status/policy/secret providers; fix/shared-export them rather than duplicate logic.
- Do not add a remote doctor tool, arbitrary URL, raw token argument, insecure TLS pass, auto-repair, mutating probe, provider resource change, or real public credentials to normal CI.
- Do not follow redirects or infer project/provider identity from hostname/DNS alone.
- Do not change stdio/tool surface or hand-edit plugin bytes.
- Do not merge; hand off for independent diagnostic/security review.

## Stop condition

Stop when the built local doctor produces a deterministic redacted schema-v1 config/local report, correctly distinguishes and orders every layer, proves bearer enforcement, official MCP initialization, expected project, exact remote tool policy, session cleanup, and no board mutation against disposable fixtures, has tested public DNS/TLS/MCP logic without insecure shortcuts, passes the root rail, and is ready for review. Do not perform the real public acceptance or merge.

## Roadmap amendment — Cloudflare doctor boundary

Add deterministic checks for cloudflared executable/version, generated ingress validation, exact-host ingress match, local listener, tunnel readiness, negative/positive bearer outcomes and expected project identity. Emit distinct redacted results for provider/config, local host, bearer and board failures. Do not add Access, service-token or identity checks.
