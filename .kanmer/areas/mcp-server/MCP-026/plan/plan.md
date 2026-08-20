# Plan — MCP-026: mandatory bearer authentication and secret lifecycle

## Objective

Make the MCP-025 Streamable HTTP host fail closed without one strong bearer-token verifier, authenticate every MCP request before body/session/tool processing, bind sessions to the active credential, support secure generation/loading/rotation/revocation, and prove that raw secret material never appears in command lines, ordinary settings, logs, status, errors, MCP output, or stdio behavior.

## Starting state

- DOC-012 defines mandatory application bearer authentication and secret-handling boundaries.
- MCP-025 supplies a loopback-only HTTP host with a required authorizer interface, session registry, one-project process, origin/method/limit preflight, and no tunnel exposure.
- GUI-095 later owns operating-system credential persistence and user controls.
- MCP-021 may start a public tunnel only after this ticket is implemented and independently reviewed.

## Required changes

### 1. Confirm predecessor contracts

1. Read the accepted remote-access FRD/ADR and record actual paths and auth requirement ids.
2. Read MCP-025 implementation, tests, ready/status schema, configuration precedence, authorizer interface, session invalidation hook, and post-implementation report.
3. Confirm authorization is invoked before body parsing and session access; stop and correct MCP-025 first if the boundary cannot be guaranteed.
4. Read current logger/redaction/error helpers and process-launch conventions.
5. Read current package build format so new TS/MJS modules are imported correctly by source and built CLIs.
6. Confirm the existing stdio command has no import-time dependency on HTTP auth configuration.
7. Confirm the accepted headless/GUI secret boundaries with GUI-095 and DOC-013 ticket docs.
8. Add no implementation until these contracts agree.

### 2. Define immutable public types and safe serialization

9. Define an opaque `BearerVerifier` type containing schema/version, token id, 32-byte digest, created/rotated timestamps, and display fingerprint.
10. Prevent default JSON serialization of the full digest/raw token; expose a separate safe metadata type.
11. Define `BearerPrincipal` with kind, token id, internal credential-generation identity, and display fingerprint.
12. Define `AuthorizationResult` success/failure without secret-bearing diagnostic strings.
13. Define coded local startup/lifecycle errors: missing config, invalid config, unsafe secret file, generation failure, rotation failure, revocation/invalidated state.
14. Define the exact generic external 401 response/challenge once.
15. Define bounded constants for accepted header/token length and token-file size.
16. Make token/verifier objects immutable after construction except through one rotation state owner.

### 3. Implement token generation

17. Implement `generateRemoteBearerToken` using `crypto.randomBytes(32)` or more.
18. Encode random bytes as unpadded base64url.
19. If a prefix is used, define it as a fixed literal and hash/compare the entire presented token.
20. Derive a SHA-256 digest from the encoded token bytes.
21. Derive a short display fingerprint from the digest using a documented fixed prefix length.
22. Generate a stable non-secret token id/generation id without embedding project/user data.
23. Return the raw token only from the explicit generation result together with verifier and safe metadata.
24. Ensure routine verifier/status serialization cannot recover/emit the raw token.
25. Permit deterministic random/time injection only through test-only dependencies.
26. Add unit tests for entropy-source invocation, encoding alphabet/padding, length, digest, fingerprint, uniqueness, and safe serialization.

### 4. Parse bearer headers strictly

27. Read the raw Node request authorization header without accepting alternate fields.
28. Reject multiple/array authorization header values.
29. Parse one scheme and one opaque credential separated according to standard bearer syntax.
30. Match `Bearer` ASCII case-insensitively.
31. Reject missing/empty token, extra credentials, embedded whitespace/control/non-ASCII values, unsupported scheme, and oversized values.
32. Do not trim a malformed token into validity.
33. Ignore/reject query/cookie/custom-header credentials; they never satisfy the authorizer.
34. Return only a typed valid candidate or generic invalid result; never include the candidate in an error.
35. Add table-driven tests for exact valid, scheme variants, leading/trailing whitespace, duplicate, comma-joined, empty, control, unicode, oversized, Basic/JWT-like, query, cookie, and custom-header cases.

### 5. Implement fixed-length verification

36. Decode the configured verifier digest from its canonical representation exactly once during configuration loading.
37. Reject malformed encoding or any digest not exactly 32 bytes.
38. For every syntactically valid candidate, calculate SHA-256 over its exact encoded bytes.
39. Compare candidate and expected 32-byte digests with `crypto.timingSafeEqual`.
40. Ensure the configured digest string itself does not authenticate unless it happens to be the original random token, which tests must disprove.
41. For malformed/missing candidates, execute a fixed dummy-digest comparison where practical without changing the generic result.
42. Clear mutable candidate/digest buffers best-effort after comparison while acknowledging JavaScript string immutability.
43. Return the opaque principal on success and no credential-dependent detail on failure.
44. Add tests with original tokens of different lengths, similar prefixes, one-character changes, digest-as-token, malformed verifier, and dummy path.
45. Prohibit raw string equality in the module through code review/search.

### 6. Build active verifier/rotation state

46. Implement a single in-memory active-verifier owner with states `absent`, `active`, and `revoked`.
47. Require an active verifier to construct/start the production authorizer.
48. Make `authorize(request)` snapshot the current verifier generation atomically for one request.
49. Return a principal containing the active generation identity so sessions bind to it.
50. Implement `rotate(newVerifier)` with validation before state replacement.
51. Invoke the MCP-025 session-invalidation callback for every session belonging to the prior generation.
52. If state replacement/session invalidation cannot complete safely, return a coded failure and require listener shutdown/restart rather than mixed authorization state.
53. Implement `revoke()` to invalidate sessions, remove active verifier, and prevent further authenticated requests/startup until replacement.
54. Make rotation/revocation idempotency and concurrent authorize behavior explicit and testable.
55. Emit only redacted generation/fingerprint/timestamp lifecycle events.
56. Add tests for success, invalid replacement rollback, concurrent request snapshot, old/new principal identity, session callback, repeated rotation/revoke, and failure-safe stop signal.

### 7. Add protected headless token-file generation

57. Implement a CLI/helper that accepts an output **path**, never a token argument.
58. Resolve/validate the target path according to repository/platform conventions and reject directories/invalid parents.
59. Create the file exclusively so an existing file is never overwritten.
60. On POSIX, request mode `0600` and verify resulting regular-file mode/ownership expectations available to Node.
61. Write exactly the generated token plus one final newline using bounded bytes.
62. Flush/close the descriptor before reporting success.
63. On any write failure, close/remove only the newly created partial file and return a redacted coded error.
64. Print safe metadata/path/fingerprint by default, never the token.
65. If the accepted CLI/manual requires one-time stdout reveal, gate it behind an explicit flag, write only to the designated output stream, display a warning, and ensure tests/loggers do not capture it inadvertently; otherwise omit reveal.
66. Do not write verifier/raw token to board documents, package config, or generated registration.
67. Add tests for successful exclusive creation, existing-file refusal, missing/uncontrolled parent handling, POSIX mode, path with spaces, partial-write cleanup, and output redaction.

### 8. Add protected token-file loading

68. Accept one configured token-file path or protected inherited verifier source according to MCP-025 config.
69. Reject simultaneous/conflicting sources instead of choosing silently.
70. Inspect the token file with `lstat`; reject symlinks and non-regular files.
71. Open with no-follow flags where the platform supports them.
72. Compare opened `fstat` identity with pre-open metadata where practical to reduce replacement races.
73. Reject files outside the bounded size before/while reading.
74. On POSIX, reject group/world-accessible mode unless the accepted manual explicitly defines a migration repair; return an actionable permission code.
75. On Windows, perform regular-file/ownership checks available to the runtime and report that ACL assurance is limited rather than treating POSIX mode as authoritative.
76. Validate exactly one permitted token value and optional final newline; reject blank, extra lines, whitespace, invalid alphabet, and oversized content.
77. Derive verifier in memory, close descriptor, and zero mutable raw buffers best-effort.
78. Return verifier plus safe file metadata only.
79. Ensure thrown errors do not embed path content where logging policy treats it as sensitive and never embed file bytes.
80. Add tests for symlink, FIFO/non-regular file where supported, mode, race-check mismatch via injection, size, blank/multiline/whitespace/invalid encoding, and canary-secret absence.

### 9. Integrate HTTP request authorization

81. Construct MCP-025 HTTP host with the real active-verifier authorizer.
82. Preserve preflight order: route/method/origin/basic limits, then bearer authorization, then body/session/MCP handling.
83. Require authorization on POST, GET, and DELETE independently.
84. On failure, send the exact generic 401/challenge and stop processing.
85. Assert body-parser, session-registry, MCP server factory, and tool handlers were not invoked.
86. On success, pass only opaque principal into session handling/log context.
87. Re-authenticate every request even when a session id is present.
88. Reject a session whose bound generation/token identity differs from the current successful principal.
89. Do not refresh session activity after failed auth.
90. Keep disallowed Origin and 404/405 behavior independent of credential validity as defined by DOC-012/MCP-025.
91. Keep health endpoint minimal/loopback-only and ensure it cannot initialize/list tools or reveal auth/project state.

### 10. Integrate CLI/process configuration

92. Define exact mutually exclusive startup sources: protected token file, verifier file/descriptor/IPC, or the already approved parent-process verifier mechanism.
93. Forbid `--token`, raw-token environment variables, and token values in JSON settings.
94. Validate config before listener creation.
95. Load/derive the verifier once and construct the authorizer.
96. Remove raw token data/reference from mutable config objects after derivation.
97. Ensure process args and machine-readable readiness contain no credential.
98. Include only auth-required true, token id/fingerprint, and creation/rotation metadata if approved for local status.
99. Use non-zero startup exit and a coded redacted event for absent, conflicting, malformed, or unsafe secret sources.
100. Keep stdio startup completely independent of these variables/files.
101. Add child-process tests that inspect argv, inherited environment, readiness, stderr, and failure output with a unique canary token.

### 11. Implement rotation/revocation process contract

102. Expose a local in-process/parent-control method for rotation without adding a remote MCP tool.
103. Require the caller to persist the new protected raw secret successfully before submitting its verifier.
104. Replace active verifier and invalidate sessions as one controlled lifecycle action.
105. Emit a redacted rotated event with old/new display fingerprints and timestamp only.
106. Make old bearer and every old session fail immediately after success.
107. Make new bearer require a fresh MCP initialization/session.
108. If the child-process architecture cannot update verifier safely in place, implement controlled listener restart with transactional parent sequencing and document that as the v1 rotation path.
109. On revoke/remote stop, close sessions and erase in-memory verifier; do not silently delete OS credential-store/headless token files.
110. Add integration tests for successful rotation, protected-persistence failure retaining old token, invalidation failure causing fail-safe stop, revoke, and restart-based equivalent.

### 12. Centralize redaction and diagnostics

111. Reuse the existing structured logger/redactor; extend one canonical allowlist rather than add competing recursive loggers.
112. Redact authorization header case variants, raw token fields, verifier/digest fields, token-file contents, bearer-like canary values, and full session ids.
113. Never serialize arbitrary request/config/error objects directly.
114. Emit bounded aggregate auth-failure events rather than one unbounded body/candidate log per attempt.
115. Keep successful principal display fingerprint short and non-authorizing.
116. Scan status, ready/stopped events, error stacks, test snapshots, diagnostic export, activity, and MCP results for the canary.
117. Add regression tests that deliberately throw errors containing secret-bearing objects and prove the external/local safe result omits them.

### 13. End-to-end and security tests

118. Start a real loopback HTTP host on port 0 with a disposable Kanmer board and protected temporary token file.
119. Prove no token, wrong token, malformed token, query token, cookie token, digest-as-token, and duplicate authorization all return identical 401/challenge.
120. Prove those failures occur before JSON parse by sending malformed/oversized bodies with invalid auth and inspecting invocation counters.
121. Prove a valid token initializes, lists only remote-approved tools, and calls a safe project/read tool.
122. Prove every subsequent POST/GET/DELETE requires the token.
123. Capture a session and prove wrong/missing token cannot probe or close it.
124. Rotate; prove old token and session fail and new token initializes.
125. Revoke; prove all sessions close and new requests fail.
126. Exercise session/connection/request limits so auth failures cannot create state or exhaust unbounded logs.
127. Inspect child process args/environment, temp files, logs, readiness, HTTP responses, MCP results, and board files for a unique canary secret.
128. Prove project fingerprints and normal Kanmer write gates remain required after authentication.
129. Prove remote discovery still excludes background dispatch.
130. Prove stdio source/built initialization/discovery and provider registration require no bearer config and remain unchanged.

### 14. Documentation, packaging, and verification

131. Update local CLI help/config schema with safe token-file/verifier-source wording and explicit prohibition on raw args.
132. Link accepted FRD/ADR requirements and DOC-013 follow-up; do not create competing long-form user instructions.
133. Update source/package scripts for the token generator and auth tests.
134. Confirm no MCP tool schema/count/reference change is required.
135. Run unit tests for auth and secret files.
136. Run HTTP integration and packaged smoke.
137. Run stdio protocol/discovery smokes.
138. Run root typecheck, build, tests, and verify.
139. Run Windows PR verification, including platform-specific file behavior without false POSIX claims.
140. If shared changes alter plugin output, regenerate from normal main checkout and run isolated plugin check; otherwise prove bundle untouched.
141. Run `git diff --check`, inspect status, and remove all temporary token/board files.
142. Record source versions, token/verifier format, startup source, negative/positive/rotation test matrix, redaction scan, stdio compatibility, and residual Windows file-risk in the post-implementation report.

## Expected files

Use the exact canonical HTTP modules established by MCP-025 plus the focused auth/secret/token-command files listed in `files.md`. Do not add an Electron dependency, remote tool, tunnel process, or second server registry.

## Acceptance checks

- Production HTTP cannot start without one valid verifier source.
- One strong opaque bearer token is the only accepted credential.
- Authentication precedes body/session/MCP processing for every endpoint method.
- Verification uses fixed-length SHA-256 digests and `timingSafeEqual`.
- External failures are indistinguishable generic 401 responses.
- Sessions bind to token generation and are invalidated by rotation/revocation.
- Headless secret files are exclusive, bounded, validated, and protected to platform capability.
- Raw token never enters argv, URL, cookie, ordinary settings, logs, status, board, MCP output, or registration.
- Rotation is transactional/fail-safe and has no grace period.
- Existing project/write gates and remote dispatch exclusion remain.
- Stdio/provider/plugin behavior is unchanged.
- Security, canary-redaction, packaged, Windows, and root verification all pass.

## Verification commands

Use the exact scripts established by the repository, including equivalents of:

```bash
npm test
npm run typecheck
npm run build
node packages/mcp-server/src/smoke-http.mjs
node packages/mcp-server/src/smoke-protocol.mjs
node packages/mcp-server/src/smoke-discovery.mjs
npm run verify
git diff --check
git status --short
```

Exercise the canonical remote-token generation command against an OS-temp protected path and remove the fixture after verification. Rebuild/check the plugin only if canonical stdio bundle bytes intentionally change.

## Failure and deviation rules

- Stop if MCP-025 does not guarantee pre-body/pre-session authorization or session-principal binding; fix the predecessor contract first.
- Stop if protected secret persistence fails before rotation; retain the old credential.
- Stop/restart fail-safe if verifier change and session invalidation cannot be made unambiguous.
- Do not accept raw token argv/query/cookie/settings, digest-as-token, JWT/OAuth/multiple-token scope, tunnel identity, remote rotation tool, or public exposure before review.
- Do not weaken project/stage/document/review/proof gates.
- Do not modify stdio behavior or hand-edit generated plugin bytes.
- Do not merge; hand the PR to independent security/protocol review.

## Stop condition

Stop when the built loopback Streamable HTTP server fails closed without protected verifier configuration, authenticates every MCP method with one strong opaque bearer using fixed-length constant-time verification before any body/session/tool handling, rotates/revokes with complete session invalidation, leaks no canary secret across all observable surfaces, preserves stdio and all Kanmer safety gates, passes the full platform/security verification rail, and is ready for independent review. Do not start a tunnel or merge.
