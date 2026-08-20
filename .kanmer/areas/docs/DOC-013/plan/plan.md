# Plan — DOC-013: provider-neutral remote-access manual

## Objective

Publish one accurate, secret-safe user manual for GUI-managed and headless remote Kanmer access, isolate cloudflared-specific provider setup, map every doctor check to repairs, and verify every command, UI label, anchor, limitation, and example against the accepted implementation and a disposable end-to-end environment.

## Starting state

- DOC-012 supplies the accepted FRD/ADR.
- MCP-021/025/026/027 and GUI-095 supply the actual provider, transport, bearer, doctor, and UI contracts.
- MCP-028 will supply final real public proof/known limitations.
- Existing manual/index/style/verification conventions must be extended rather than duplicated.

## Required changes

### 1. Confirm canonical documentation locations and accepted feature state

1. Read the current manual tree/index, docs index, root README links, Markdown conventions, anchor/link verifier, placeholder/admonition/code-tab style, and supported platform wording.
2. Confirm whether the proposed `docs/manual/` paths in `files.md` are canonical; update this ticket before writing if not.
3. Read the accepted remote FRD/ADR and capture actual paths, requirement ids, terminology, and explicit non-goals.
4. Read final implementations and post-implementation reports for MCP-021/025/026/027 and GUI-095.
5. Read actual package scripts/bins/help output, GUI navigation/labels, settings schema, secure-storage backend policy, process/quit behavior, doctor ids/results/exits, and cloudflared supported mode/version/fields.
6. Read MCP-028 plan and, when available, its final proof/known limitations.
7. Re-check official MCP/Electron/Cloudflare source titles and current behavior relied upon by implementation.
8. Create a traceability worksheet mapping every FRD requirement and doctor check to one planned manual section.
9. Stop and record an open question if any implementation behavior conflicts with the accepted FRD; do not paper over it in documentation.

### 2. Freeze terminology and audience boundaries

10. Define a glossary for project fingerprint, remote host, loopback origin, public endpoint, tunnel adapter/provider, cloudflared, application bearer, provider credential, session, connected, verified, stale verification, GUI owner, and headless owner.
11. Use “bearer token” only for the Kanmer application credential and “provider credential” for tunnel credentials.
12. Define one-project-per-endpoint/process explicitly.
13. Define stdio as separate/unchanged.
14. Define connected versus publicly verified exactly.
15. Define GUI-managed and headless operating paths and mutual ownership exclusion.
16. Define all unsupported/deferred features in one canonical limitations list.
17. Add a terminology validator/list or review checklist to prevent provider/application credential conflation and cloudflared leakage into provider-neutral sections.

### 3. Write overview and security model

18. Create `remote-access.md` with title/summary and audience.
19. Explain what remote access enables and its authority/risk in plain language.
20. State mandatory HTTPS tunnel plus Kanmer bearer authentication.
21. Explain that provider access controls do not replace the bearer.
22. Explain one project/fingerprint per endpoint and normal expected-project/stage/document/review/proof protections.
23. State remote background dispatch is excluded.
24. State v1 bearer limitations: possession credential, one active token, no per-user identity, rotation disconnects sessions.
25. State GUI-owned access ends on true app quit and headless ownership is separate.
26. Link accepted FRD/ADR only through canonical relative docs links where appropriate.
27. Add a warning/admonition that never includes a realistic token.

### 4. Write architecture and terms

28. Add a small provider-neutral text/Mermaid diagram matching the accepted process boundary.
29. Explain remote client→HTTPS provider→adapter→loopback authenticated host→one project/tool registry.
30. Explain local, tunnel, and public health dimensions and their statuses.
31. Explain bearer versus provider credentials and where each is stored/read.
32. Explain sessions are in memory and reconnect after restart/rotation.
33. Explain the connector doctor modes and when each is used.
34. Link glossary terms consistently and validate diagram rendering.

### 5. Build a verified prerequisites table

35. List shipped Kanmer/app/server release and supported platforms from actual release metadata.
36. Require a healthy registered project and full fingerprint.
37. Require secure GUI storage backend or protected headless token path.
38. Require a supported tunnel adapter/executable/version.
39. Require an operator-provisioned named tunnel, stable HTTPS hostname, and protected provider credential reference for cloudflared.
40. Require permission to configure the remote MCP client.
41. Require no duplicate GUI/headless owner or duplicate hostname/tunnel identity.
42. Map every row to exact MCP-027 config/local check ids.
43. Distinguish required versus optional/diagnostic items.
44. Add no claim that Kanmer downloads/creates provider resources.

### 6. Verify and document GUI setup

45. Launch the built GUI against a disposable registered project and fake/controlled provider fixture.
46. Record the exact Remote Access navigation label and project overview/detail labels.
47. Walk every setup stage in the actual UI: provider, executable, named tunnel, hostname, credential reference, bearer, review, save.
48. Verify secure-storage unavailable/unsafe behavior and document the exact blocker/alternative.
49. Generate a disposable bearer, confirm one-time modal wording/mask/reveal/copy/close behavior, then destroy it; copy no live value into docs.
50. Verify save/version conflict, start phases, connected-unverified state, doctor flow, verified state, rotate warning/new delivery, stop, missing project, duplicate owner, and true app quit behavior.
51. Write numbered GUI steps using exact labels and state transitions.
52. Explain auto-start for multiple projects, uniqueness conflicts, bounded starts, and isolated failures without exposing internal implementation trivia.
53. Add confirmations/consequences for rotate/material config change/remove/project reconcile/quit.
54. Avoid screenshots unless the existing maintained screenshot process is used; never capture a real secret.
55. Add links to the relevant troubleshooting/check entries at each failure boundary.

### 7. Verify and document headless setup

56. Build/install the actual package/CLI in a disposable path containing spaces.
57. Capture exact command names, flags, config-file schema/path, stdout/stderr, and exits from `--help`/source/package metadata.
58. Run the protected token generator to a disposable non-existing file; verify permissions/output/no overwrite.
59. Create a synthetic provider configuration using placeholders/fixture credentials and exact supported schema.
60. Start the remote host through the shipped headless command and capture redacted readiness/status.
61. Run config and local doctor modes.
62. Stop through the shipped lifecycle/signal command and verify cleanup.
63. Where MCP-028 environment is available, run public doctor and use only safe result excerpts.
64. Write exact Bash and PowerShell examples only when both are actually supported/tested; otherwise label platform-specific commands honestly.
65. Never document raw token argv/environment/plain JSON settings.
66. Explain operator-owned process supervision as external to Kanmer v1; do not publish an untested service recipe.
67. Explain GUI/headless ownership conflict and resolution.
68. Add expected safe outputs/exits without full raw logs or machine-specific paths.

### 8. Document generic remote MCP client setup

69. Confirm the exact public endpoint path/base semantics from the shipped MCP server and SDK/client behavior.
70. State standard HTTPS endpoint and `Authorization: Bearer <token>` requirement.
71. Explain normal MCP initialization and post-connect project fingerprint/tool verification.
72. Provide a generic configuration shape with obvious placeholders and warning that client formats vary.
73. Add client-specific snippets only for clients whose current format/version has been tested in a disposable setup during this ticket/MCP-028.
74. Label each verified client example with tested version/date/platform and ownership of token storage.
75. Omit unsupported/uncertain client formats rather than guess.
76. Explain how to update clients after rotation and how old sessions fail.

### 9. Document operation and lifecycle

77. Explain start/stop/local/tunnel/public statuses and when verification becomes stale.
78. Explain when to run config, local, and public doctor.
79. Explain multi-project auto-start, unique provider identities, and project failure isolation.
80. Explain true application quit, renderer/window reload, and headless ownership behavior.
81. Explain token rotation, immediate session invalidation, client update, and lost-token recovery through rotation.
82. Explain project move/reconcile only on exact fingerprint and wrong-fingerprint refusal.
83. Explain remove/revoke ordering and that provider credential files/resources are not silently deleted.
84. Explain cloudflared executable update is operator/provider-owned in v1 and rerun doctor afterward.
85. Explain logs/diagnostic export are redacted but should still be reviewed before sharing.

### 10. Write complete doctor troubleshooting matrix

86. Add all 26 exact ids from MCP-027 to `remote-access-troubleshooting.md` in execution order.
87. For each id, state layer, mode, pass condition, safe expected/observed fields, likely causes, ordered repairs, status/log location, rerun mode, and stop/escalate condition.
88. Derive wording/repair codes from the actual doctor registry and GUI mappings, not duplicated speculation.
89. Use provider-neutral repairs for common project/config/auth/MCP/TLS issues.
90. Link cloudflared-specific failures to provider appendix sections.
91. Explain skipped checks as failed prerequisites rather than independent defects.
92. Explain exits 0/1/2 and JSON versus human output.
93. Include common scenario paths: missing executable, unsafe secret storage/file, stopped local host, wrong token, wrong project, dispatch tool leak, tunnel not ready, DNS/TLS/redirect, route to wrong instance, session close failure, redaction/no-mutation failure.
94. Prohibit insecure TLS bypass, wildcard bind, Quick Tunnel production, token-in-URL, raw log publication, force takeover, and blind retry.
95. Add structural validator asserting every exact id appears once and no unknown id is introduced.

### 11. Write cloudflared provider appendix

96. State this is the first adapter, not the generic architecture.
97. Verify and document the exact supported named-tunnel mode from MCP-021.
98. Link to current official Cloudflare documentation titles through repository-approved link style.
99. Describe obtaining/installing a supported executable without claiming Kanmer auto-download.
100. Describe externally creating/provisioning the named tunnel and stable hostname/DNS route without embedding account-specific values.
101. Describe protected provider credentials reference and platform permission cautions.
102. List exact GUI/headless fields and validation behavior.
103. Explain generated local ingress conceptually without asking users to paste arbitrary YAML unless the shipped headless workflow explicitly requires it.
104. Explain readiness, update/replacement, rollback, and doctor checks.
105. State Quick Tunnels are not the production path and why at a high level without overpromising protocol details beyond verified official docs.
106. Explain that Cloudflare Access/provider policies may add defence in depth but do not replace Kanmer bearer auth.
107. Include no provider token/credential JSON/real hostname/account id.

### 12. Write security, privacy, and limitations

108. Consolidate bearer/provider secret handling, OS backend/file limitations, clipboard history warning, session lifetime/rotation, project identity, loopback origin, tunnel/provider trust, logs, and safe sharing.
109. State no OAuth/per-user attribution/multiple active tokens/grace rotation.
110. State no remote dispatch, multi-board router, browser API/CORS, WebSocket, managed relay, persistent sessions, provider account/DNS automation, executable auto-download, Quick Tunnel production, or Kanmer-owned service.
111. State that possession of bearer does not bypass existing Kanmer workflow gates but can invoke approved remote mutating board tools.
112. Explain incident response: stop remote access, rotate/revoke token, inspect doctor/status, update clients, verify expected project, preserve safe evidence.
113. Keep security language actionable and consistent with FRD threat model.

### 13. Add indexes and traceability

114. Add manual/provider/troubleshooting entries to the canonical manual/docs indexes in reading order.
115. Add one concise root README pointer only; coordinate to avoid conflict with DOC-008.
116. Add FRD/ADR/manual traceability links only where canonical policy permits.
117. Add a table mapping every remote FRD requirement id to a manual heading, doctor check, and implementation ticket.
118. Validate all relative links and generated anchors.
119. Ensure provider appendix links back to generic security/doctor sections and vice versa.

### 14. Add documentation verification rules

120. Extend the one canonical docs verifier.
121. Assert required files/headings/anchors exist.
122. Assert every doctor check id appears exactly once in the troubleshooting matrix and every id used is canonical.
123. Assert the provider-neutral main file contains no cloudflared command flags/account setup except links to provider appendix.
124. Scan for forbidden patterns: raw token flags/settings/query examples, `--insecure` pass, wildcard bind, Quick Tunnel production language, realistic bearer/provider credential patterns, local user paths, real hostnames/session ids.
125. Seed a unique canary in disposable verification inputs and ensure it cannot appear in generated docs/test output.
126. Validate Markdown, code fences, links, anchors, diagrams, line endings, and relative paths.
127. Validate commands against `--help` or execute them in disposable fixtures rather than merely syntax-highlight them.
128. Keep verification deterministic/offline except the explicit controlled MCP-028 public proof.

### 15. User walkthrough and final verification

129. Conduct a clean GUI walkthrough using only the draft manual and a disposable project/provider fixture.
130. Conduct a clean headless walkthrough in a path containing spaces using only the draft manual.
131. Have a reviewer unfamiliar with internals identify endpoint, token/provider credential difference, connected/verified difference, doctor mode, rotation, stop, and limitations from the manual alone.
132. Run every safe command/code snippet and record platform/version/result.
133. Compare every UI label/status/action with built GUI.
134. Compare all doctor ids/repairs/exits with actual registry/output.
135. Incorporate safe MCP-028 public report evidence/known limitations when available.
136. Run docs verification, root verification, `git diff --check`, and secret-pattern/canary scan.
137. Search repository for duplicate/stale remote instructions and replace with links only where within ticket scope.
138. Record traceability counts, command/UI test matrix, reviewer findings, link/anchor/secret scans, and known deferred client/provider examples in the post-implementation report.

## Expected files

Create the provider-neutral manual, complete troubleshooting matrix, cloudflared appendix, and canonical index/verifier updates listed in `files.md`. Do not implement behavior or duplicate setup in root README.

## Acceptance checks

- Main manual is provider-neutral and distinguishes all trust/credential/status concepts.
- GUI and headless paths use exact shipped labels/commands and have been executed in disposable setups.
- Cloudflared specifics are isolated, current, named-tunnel only, and secret-safe.
- Every doctor id has one accurate repair entry and every prerequisite skip/exit is explained.
- Client configuration is generic unless a current format was actually tested.
- Token/credential/project/session/path examples are synthetic placeholders only.
- No insecure/unsupported workaround is documented.
- All required anchors/indexes/traceability exist.
- Docs/command/UI/link/secret/user-walkthrough verification passes.

## Verification commands

Use the canonical repository commands, including equivalents of:

```bash
npm run verify:docs
npm run verify
npm test
git diff --check
git status --short
```

Also execute the actual packaged remote token, remote host, and doctor commands in a disposable environment on each documented supported command shell/platform. Record results without secrets.

## Failure and deviation rules

- Stop if implementation contradicts accepted FRD/ADR or command/UI behavior is unavailable; correct/escalate rather than document fiction.
- Do not add implementation code, real secrets/hostnames/paths, guessed client/provider commands, insecure TLS/wildcard/token-URL/plaintext/Quick-Tunnel instructions, or unsupported service claims.
- Do not duplicate setup in README or mix provider credentials with Kanmer bearer.
- Do not merge; hand off for independent documentation/security/usability review.

## Stop condition

Stop when a new operator can use only the verified manual to configure either GUI-managed or headless one-project remote access, securely deliver the bearer, distinguish provider credentials and connected versus verified state, run and interpret every doctor check, rotate/recover/stop safely, understand all limitations, and complete the disposable walkthrough without secret leakage or undocumented behavior; all documentation/root checks are green and the PR is ready for review.
