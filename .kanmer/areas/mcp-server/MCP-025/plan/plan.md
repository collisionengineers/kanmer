# Plan — MCP-025: add a fail-closed Streamable HTTP transport

## Objective

Add an internal, loopback-only, authenticated-by-injection Streamable HTTP process around the existing Kanmer MCP server while preserving stdio exactly. Use the pinned official MCP SDK, one immutable project per process, bounded in-memory sessions, a named remote tool-exposure policy, machine-readable lifecycle events, and comprehensive local tests. Do not expose a tunnel or production unauthenticated mode.

## Starting state

- The MCP server starts through stdio and owns one canonical tool registry.
- DOC-012 defines the governing remote architecture.
- MCP-026 will supply bearer authentication.
- MCP-021/GUI-095 must not expose this listener until authentication exists.
- MCP-020 background dispatch is excluded from remote mode.

## Required changes

### 1. Confirm the accepted contract and SDK API

1. Read the accepted DOC-012 FRD/ADR and record actual paths/requirement ids.
2. Inspect `@modelcontextprotocol/sdk` version, package exports, TypeScript types, and official matching Streamable HTTP example/tests.
3. Record whether the supported adapter is native Node HTTP, Express, or another SDK-owned bridge.
4. Confirm exact session-header, protocol-version, POST/GET/DELETE, JSON/SSE, and close callback behavior.
5. Confirm current stdio entry, tool registration flow, root/store creation, signal handling, output channels, and plugin build inputs.
6. Identify exact MCP-020 dispatch tool ids; if not yet implemented, define a placeholder policy test that must be completed when it lands.
7. Stop and amend this plan if the pinned SDK cannot implement the accepted ADR without a version upgrade; do not hand-roll a substitute.

### 2. Extract one shared server/tool composition

8. Move only server construction and canonical tool registration into the existing/new `server.ts` helper.
9. Accept an immutable context containing resolved store/project/capabilities and a named exposure policy.
10. Keep handlers, schemas, structured errors, expected-project enforcement, and document helpers unchanged and single-sourced.
11. Implement policy filtering at registration/discovery once.
12. Define `local-stdio` as the existing complete tool set.
13. Define `remote-http-v1` as local minus an explicit constant set of background-dispatch ids.
14. Reject unknown policy names at startup.
15. Add a structural test that local names/schemas are unchanged from the pre-refactor snapshot.
16. Add a set-difference test for remote discovery.
17. Do not add transport checks inside individual handlers.

### 3. Preserve stdio entry

18. Adapt `index.ts` to call the shared factory with `local-stdio`.
19. Preserve executable name/arguments, stdout protocol purity, stderr logging, signal behavior, roots, environment, tool count, and provider manifest commands.
20. Run existing source and built stdio protocol/discovery smokes immediately after the refactor before writing HTTP code.
21. If generated plugin bytes change, postpone regeneration until all source changes pass, then use the canonical main-checkout build/check.

### 4. Define validated HTTP configuration

22. Add typed config for host, port, endpoint path, origin allowlist, header/body/request/keepalive limits, session caps/TTL/sweep interval, in-flight caps, and graceful shutdown timeout.
23. Default host to `127.0.0.1`; optionally support `::1` through explicit config/test.
24. Permit port `0` for tests/parent allocation and validate explicit production range.
25. Fix endpoint path to `/mcp` in v1; reject traversal/query-derived routing.
26. Reject wildcard, LAN, hostname, or non-loopback bind values.
27. Validate positive bounded numeric limits and allowlist syntax before creating a listener.
28. Keep defaults in one exported/read-only object and redact config serialization.

### 5. Define required authorization interface

29. Define an injected asynchronous authorizer called before request-body parsing and session lookup.
30. Return an opaque principal/fingerprint and optional authorization context; never token bytes.
31. Define a uniform unauthorized result path without leaking whether a session/project/tool exists.
32. Make production HTTP host construction/start fail if no authorizer is supplied.
33. Export a clearly test-only stub from test code, not the production CLI.
34. Define a session-invalidation hook/interface MCP-026 can call on token rotation.
35. Do not implement token parsing/storage/comparison in this ticket.

### 6. Implement origin/host preflight

36. Validate present `Origin` against explicit allowlist before auth/body processing.
37. Allow requests without `Origin` from non-browser MCP clients, subject to auth.
38. Reject disallowed/malformed origin with generic response and structured redacted event.
39. Do not enable wildcard CORS or add browser preflight behavior unless mandated by accepted FRD.
40. Use only the direct loopback host in this ticket; define trusted-forwarded-header interface but do not trust arbitrary forwarded values.
41. Ensure `Host` cannot select project or alter local bind behavior.

### 7. Implement session registry

42. Follow SDK session ownership rules; create the registry abstraction only for lifecycle/limits not already provided.
43. Generate/accept only SDK/server-generated cryptographically random session ids.
44. Associate each entry with opaque authorized principal, server/transport/session object, timestamps, and in-flight count.
45. Enforce total and per-principal session caps.
46. Enforce idle TTL and bounded sweep using an injectable clock/timer for tests.
47. Reject unknown, malformed, expired, closing, or cross-principal session ids.
48. Make close idempotent and dispose server/transport exactly once.
49. Remove entries on DELETE, SDK close, expiry, authorization invalidation, and host shutdown.
50. Do not persist session or ticket data.

### 8. Implement `/mcp` routing through the SDK

51. Create listener using the supported SDK adapter/native server decision from step 3.
52. Route exactly `/mcp`; return 404 elsewhere.
53. Allow POST, GET, DELETE; return 405 plus Allow header for others.
54. Apply request/header/body/connection/in-flight limits before expensive processing.
55. Run origin validation, then authorizer, then session validation/creation, then SDK handler.
56. Let the SDK own JSON-RPC parsing, initialization, protocol negotiation, content types, JSON/SSE framing, notifications, cancellation, and protocol errors.
57. Create/associate MCP server transport objects according to the SDK's per-session model.
58. Require normal initialization before tools.
59. Handle client disconnect and cancellation without leaking in-flight counters/session resources.
60. Keep HTTP/protocol errors outside Kanmer tool success envelopes.
61. Never accept board/project/root from path, query, headers, or MCP metadata.

### 9. One-project startup and readiness

62. In the CLI/process entry, resolve one board through existing root logic before binding.
63. Capture project id/fingerprint and compatibility metadata immutably.
64. Require authorizer configuration; fail before listener on absence.
65. Start session registry and bind loopback listener.
66. Obtain actual allocated port and construct local endpoint.
67. Perform an internal local health/readiness assertion without bypassing auth semantics.
68. Emit exactly one parseable ready event containing kind/schema, PID, loopback host/port/endpoint, project id/fingerprint, mode, auth-required, SDK/protocol version where available.
69. Redact secrets/session ids and keep logs on stderr/structured sink.
70. Do not start a tunnel or write GUI settings.

### 10. Shutdown and failure handling

71. Install idempotent shutdown for SIGINT, SIGTERM, parent request, startup rollback, and test teardown.
72. Mark stopping and refuse new sessions.
73. Stop accepting connections.
74. Close/abort sessions and wait for in-flight work up to grace timeout.
75. Destroy remaining sockets/transports and clear timers/registry.
76. Close listener and emit one stopped event/reason.
77. Use non-zero startup exit for invalid config/root/auth/bind failures.
78. Bound captured request/log data and never echo authorization/document bodies.
79. Ensure repeated shutdown calls do not throw or double-dispose.

### 11. Unit and integration tests

80. Test configuration defaults and every invalid host/port/path/limit.
81. Test no-authorizer production startup failure.
82. Test origin allowed/absent/disallowed before authorizer invocation as appropriate.
83. Start a real loopback server on port 0 with disposable board and test authorizer.
84. Use official MCP client transport for initialize and `tools/list`.
85. Compare local and remote tool sets exactly.
86. Test a safe read tool/project fingerprint.
87. Test POST/GET/DELETE lifecycle according to SDK support.
88. Test 404/405, malformed content/protocol version through raw HTTP.
89. Test unknown/malformed/expired/cross-principal session.
90. Test total/per-principal session and in-flight caps.
91. Test concurrent initialization/order conditions.
92. Test disconnect/cancellation releases resources.
93. Test idle expiry with fake clock plus one bounded real-TTL case.
94. Test DELETE, expiry, auth invalidation, and shutdown each dispose once.
95. Test shutdown with idle, active, forced-timeout, and repeated close.
96. Capture logs/readiness and assert no token/full session/document content.
97. Assert request cannot select another board.
98. Assert no public/tunnel/listener other than loopback exists.

### 12. Built-output and regression verification

99. Add built HTTP smoke only if unit integration does not launch packaged output.
100. Run existing stdio source/built protocol/discovery smokes.
101. Run root test/typecheck/build/verify.
102. If shared source changed plugin bytes, regenerate from normal main checkout and run isolated `plugin:check`; assert provider command remains stdio.
103. Run Windows PR verification.
104. Run `git diff --check` and inspect no disposable board/session files remain.
105. Record SDK/API choice, local endpoint, tool-set diff, lifecycle/limit/shutdown proof, and stdio compatibility in post-implementation report.

## Expected files

Modify/add only the canonical server factory, stdio entry, HTTP host/config/session/CLI/tests/smokes, package routing, governing references, and generated plugin artifact when the canonical build requires it.

## Acceptance checks

- One tool registry/factory serves unchanged stdio and filtered HTTP.
- Production HTTP cannot start without an authorizer.
- Listener is loopback-only and `/mcp` uses official SDK POST/GET/DELETE behavior.
- One project/fingerprint is immutable for process lifetime.
- Sessions are secure, principal-bound, bounded, expiring, and fully cleaned.
- Remote discovery excludes only approved dispatch tools.
- Ready/shutdown/log contracts are machine-readable and redacted.
- No tunnel/GUI/token implementation or public unauthenticated path exists.
- Stdio protocol/provider/plugin behavior remains green.

## Verification commands

Use exact package scripts, including equivalents of:

```bash
npm test
npm run typecheck
npm run build
node packages/mcp-server/src/smoke-protocol.mjs
node packages/mcp-server/src/smoke-discovery.mjs
node packages/mcp-server/src/smoke-http.mjs
npm run verify
```

If generated stdio bundle changes, from normal main checkout:

```bash
npm run plugin:build
npm run plugin:check
git diff --check
git status --short
```

## Failure and deviation rules

- Stop for SDK/ADR mismatch; do not hand-roll MCP framing.
- Stop if HTTP can start without an authorizer or bind non-loopback.
- Do not add tunnel/GUI/bearer/OAuth/multi-board/browser/dispatch/persistent-session scope.
- Do not change local tool schemas/stdio registration except approved shared refactor.
- Do not hand-edit generated plugin.
- Do not merge or unblock public exposure before MCP-026 review passes.

## Stop condition

Stop when a built local HTTP process can securely initialize and list the approved remote-safe Kanmer tools through the official Streamable HTTP SDK on loopback with injected test authorization, bounded session/lifecycle behavior, immutable project fingerprint, redacted machine-readable status, unchanged stdio/provider behavior, complete tests, and a review-ready PR. Do not expose a tunnel or merge.
