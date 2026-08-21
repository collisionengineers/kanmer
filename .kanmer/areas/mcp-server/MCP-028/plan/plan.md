# Plan — MCP-028: final public remote-access acceptance

## Objective

Prove the reviewed remote-access stack works end to end for one disposable Kanmer project through a real named public tunnel and trusted HTTPS endpoint, while preserving stdio, project/tool/gate/session/rotation/process safety. Produce only deterministic sanitized evidence, fail on any secret leak or cleanup defect, and keep real provider credentials out of ordinary CI and repository state.

## Starting state

- DOC-012 defines the accepted remote-access requirements and architecture.
- MCP-025/026/021 implement Streamable HTTP, bearer lifecycle, and cloudflared adapter.
- MCP-027 supplies stable config/local/public doctor checks.
- GUI-095 supplies secure multi-project desktop management and reviewed local/fake integration.
- DOC-013 supplies verified setup and troubleshooting instructions.
- A protected pre-provisioned named-tunnel environment is required; this ticket does not create provider resources.

## Required changes

### 1. Freeze predecessor versions and acceptance inputs

1. Read accepted FRD/ADR, final predecessor code, post-implementation reports, proof documents, package scripts, and DOC-013 commands.
2. Record the exact full commit SHA and built artifact identity under test.
3. Refuse a dirty source tree or artifact whose embedded/version metadata does not match the requested commit.
4. Record exact Node, operating system, Electron where applicable, MCP SDK, cloudflared, and Kanmer versions.
5. Verify the current remote doctor check ids and required-pass semantics.
6. Verify the canonical remote tool exposure set and exact background-dispatch ids.
7. Verify the exact structured errors for expected-project, document version, and selected gate failures.
8. Verify the shipped token generation/rotation and remote-host start/stop commands/APIs.
9. Confirm the environment is dedicated and contains no production project, endpoint, or credential.
10. Confirm one integration owner/concurrency lock and one named-tunnel configuration are available.
11. Confirm protected provider credential and hostname references are readable through approved sources.
12. Refuse invocation if any required input is supplied as a raw bearer/provider secret command argument.

### 2. Define stable integration result contract

13. Add schema-v1 input/result/check/evidence/failure/cleanup/secret-scan types.
14. Define the exact ordered check ids listed in `files.md` and explicit severity/status.
15. Define statuses `pass`, `warn`, `fail`, and `skipped`; define overall pass only when every required check and cleanup/secret scan passes.
16. Define failure classifications `product`, `environment`, and `harness` with safe codes.
17. Define safe evidence fields: expected/observed hashes, versions, counts, durations, masked ids, doctor check counts, process generation, and exit classification.
18. Prohibit arbitrary stdout/stderr/config/environment/request/response objects in result fields.
19. Define one endpoint fingerprint/masking function and one fixture-id/hash representation.
20. Define deterministic JSON serialization and a Markdown renderer sourced only from that JSON.
21. Add result-schema validation before writing artifacts.
22. Add tests for order, aggregation, classification, forbidden fields, renderer equivalence, and malformed result refusal.

### 3. Implement protected operator invocation

23. Add the canonical `verify-remote-public` operator script.
24. Require an explicit acknowledgement flag/environment identifying a controlled public integration run.
25. Require exact commit SHA, output directory, project fixture root, provider configuration reference, hostname reference, cloudflared reference, bearer destination/reference, timeout policy, and provider-resource ownership policy.
26. Accept no arbitrary public URL when a validated configured hostname exists.
27. Resolve all paths canonically and reject repository/production-board/prohibited roots.
28. Acquire a filesystem/provider concurrency lock before creating secrets or starting processes.
29. Include owner/PID/start time/generation in the lock and refuse a live owner; recover only a demonstrably stale lock without killing unrelated processes.
30. Create a unique OS-temp runtime root and explicit sanitized output root.
31. Register cleanup immediately after each created resource.
32. Handle SIGINT/SIGTERM/uncaught failure through the same idempotent cleanup path.
33. Emit only one final JSON result to stdout in JSON mode; operational progress remains bounded/redacted on stderr.
34. Preserve exits: 0 pass, 1 completed failed acceptance, 2 invalid invocation/harness inability to produce reliable evidence.
35. Add invocation/lock/path/signal/exit/stdout-stderr tests with no public network.

### 4. Build a disposable project fixture

36. Create a unique format-3 Kanmer project/board outside the source repository and real board.
37. Populate canonical project metadata and capture full expected fingerprint.
38. Create the standard stages/profile/config required by the tested build.
39. Add a read-only orientation target and one normal readable ticket.
40. Add one versioned document target with known initial content/version and a synthetic canary phrase.
41. Add one ticket/action deliberately blocked by a live document/question/dependency/stage gate that is exercised through a public mutating call.
42. Add a second disposable project/fingerprint only as a negative target to prove request data cannot switch projects; do not start a second endpoint.
43. Capture before hashes/versions/activity/item counts and repository/board snapshot.
44. Ensure fixture ids are deterministic within the run and contain no production names/data.
45. Validate all fixture invariants locally before starting remote access.
46. Register complete fixture/worktree cleanup and add unit tests for construction, hashes, negative project, gate state, and no production-path overlap.

### 5. Generate and protect ephemeral bearer material

47. Generate the Kanmer bearer through MCP-026's shipped helper/CLI into a newly created protected run-scoped destination.
48. Generate a unique bearer canary representation for leak scanning without writing the token into result/log metadata.
49. Validate token file/backend permissions and safe fingerprint metadata through canonical code.
50. Keep the raw token in the smallest owner/client scope.
51. Deliver verifier/raw credential to the remote host and client only through approved inherited descriptor/IPC/protected-file mechanisms.
52. Never include bearer in argv, public URL, ordinary JSON config, event metadata, proof, or workflow command echo.
53. Create an independent wrong token of matching format without deriving/logging a near-copy of the real token.
54. Register token/buffer/delivery/clipboard-fixture cleanup.
55. Add local harness tests that seed canaries and prove every retained surface is clean.

### 6. Validate protected provider configuration

56. Load the pre-provisioned named-tunnel/provider configuration through MCP-021 validators.
57. Verify supported cloudflared executable/version/flags and named-tunnel mode.
58. Verify the public hostname is the expected dedicated integration hostname and not a production/unknown endpoint.
59. Verify provider credential reference regular-file/platform protection without retaining contents.
60. Verify generated runtime ingress will map only the configured hostname to the exact loopback origin plus the 404 catch-all.
61. Record only safe provider/version/mode/hostname fingerprint metadata.
62. Do not run account login, tunnel creation, DNS mutation, Quick Tunnel, update, or service-install commands.
63. Treat deterministic provider configuration failure as non-retryable environment/configuration failure.

### 7. Run exact local baseline regressions

64. Run the repository's canonical root verification for the exact commit/artifact before public startup.
65. Run canonical stdio source/built initialization, discovery, and safe read smoke.
66. Run isolated plugin check when the artifact includes/changes the plugin.
67. Run remote config doctor with the protected environment.
68. Start the authenticated loopback host without the tunnel and run local doctor.
69. Assert local project fingerprint, remote tool policy, bearer negative/positive behavior, session close, redaction, and no board mutation checks pass.
70. Record command ids, exit statuses, test counts, and hashes—not raw output.
71. Abort public startup if any required baseline fails.
72. Ensure normal root verification did not itself invoke the public integration script.

### 8. Start the canonical remote host and named tunnel

73. Start the reviewed remote-host composition bound to the disposable project and ephemeral verifier.
74. Capture machine-readable local readiness and verify loopback-only address, auth required, project fingerprint, process/auth generations, and canonical endpoint path.
75. Complete one authenticated local MCP initialize/read before starting the tunnel.
76. Start the reviewed cloudflared named-tunnel adapter using the validated provider reference.
77. Capture only normalized state events and safe generation/PID/version metadata.
78. Require provider readiness/connected state, not child existence.
79. Derive the public endpoint only from the configured hostname.
80. Mark public state unverified until the public doctor/client pass.
81. Abort/clean up if origin generation/project/auth state changes during startup.
82. Do not expose or attach raw cloudflared logs.

### 9. Run public DNS, TLS, route, and bearer checks

83. Invoke MCP-027 public doctor through the built library/CLI using protected bearer access.
84. Require all applicable required public doctor checks to pass, including DNS, standard TLS hostname/certificate, no redirect, missing-auth rejection, initialize, project, tool policy, session close, consistency, redaction, and no mutation.
85. Independently run the separate client process's raw missing-auth probe and confirm exact generic 401/challenge.
86. Run the independent wrong-token probe and confirm the same result.
87. Run query and cookie token probes and confirm neither authenticates.
88. Confirm negative probes do not create/refresh a session and do not reach MCP body/tool processing where observable safely.
89. Record only status/challenge class/timing/counts, never headers/tokens/body.
90. Treat TLS bypass, hosts override, redirect following, or provider login intermediary as failure.
91. Allow at most the configured bounded retry for a separately classified transient DNS/provider propagation event; record every attempt and delay.

### 10. Prove official public MCP interoperability

92. Launch the separate-process official SDK client with protected credential delivery and exact public endpoint.
93. Prefer a separate protected runner/host/network; otherwise record that client and origin share the runner while still using public DNS/TLS/provider route.
94. Complete normal MCP initialization and capture safe negotiated version metadata.
95. List tools and compare exact canonical `remote-http-v1` names/policy signature.
96. Call the canonical read-only orientation/status tool and compare the full expected disposable project fingerprint.
97. Attempt to invoke each exact remote-excluded background-dispatch tool id and assert unknown/unavailable before handler work.
98. Attempt to provide alternate project/root/request-selection metadata and prove the endpoint remains bound to the original project.
99. Close the client and verify the diagnostic session is removed.
100. Record safe counts/signatures/fingerprint/exit/timing only.

### 11. Prove project, version, mutation, and gate behavior remotely

101. Read the prepared document through the public MCP client and capture its exact version/hash without retaining canary content.
102. Issue a write with an intentionally wrong `expected_project` and correct document version.
103. Assert the canonical expected-project error and verify no content/version/activity mutation.
104. Issue a write with the correct project but intentionally stale/wrong document version where the public tool supports version concurrency; assert canonical no-mutation error.
105. Issue exactly one controlled correct document mutation with correct project/version and known replacement content in the disposable fixture.
106. Read it back and assert expected new version/hash/content predicate; retain only ids/hashes/versions.
107. Inspect activity/item/document snapshot and assert only the intended mutation occurred.
108. Attempt the prepared gate-blocked move/write through public MCP.
109. Assert the exact live gate error/report and verify stage/document/activity remain unchanged except permitted diagnostic activity, if any.
110. Confirm bearer possession did not bypass stage/doc/question/dependency/expected-project controls.
111. Restore or retain the disposable mutation according to fixture proof policy; cleanup will delete the whole project regardless.

### 12. Prove public session lifecycle and limits

112. Initialize a public session and perform a subsequent authenticated request.
113. Attempt the same session with missing/wrong bearer and assert rejection without session information leakage.
114. Close via official client/DELETE and verify removal.
115. Create a fresh session, then restart only the owned remote host according to shipped lifecycle while preserving tunnel recovery policy.
116. Assert the old session no longer works after process restart.
117. Reconnect/initialize and confirm project/tool policy remains unchanged.
118. Run a small bounded set of concurrent read-only requests within configured limits and assert all complete without board corruption.
119. Exceed a configured session/in-flight limit only in a controlled bounded way if the accepted integration environment permits it; assert safe rejection and cleanup.
120. Do not turn this into a throughput/load benchmark.

### 13. Prove bearer rotation and revocation

121. Generate/persist a second ephemeral bearer through the shipped headless or GUI-managed secure rotation path.
122. If GUI rotation is not used in the real public environment, link GUI-095's reviewed GUI rotation test and use canonical headless rotation for public proof.
123. Apply in-place rotation or transactional remote-host restart exactly as shipped.
124. Assert all old sessions are invalidated and the old bearer fails missing-state-indistinguishably.
125. Assert the new bearer requires fresh initialization and then succeeds.
126. Run public doctor again and require current auth generation/project/tool policy consistency.
127. Record old/new safe fingerprints/generation ids only.
128. Revoke or intentionally stop at the end and assert no dual-token grace path existed.
129. Register deletion of both protected ephemeral bearer records.

### 14. Prove tunnel degradation, supervision, and recovery

130. Identify the exact owned cloudflared child/generation from canonical status.
131. Terminate only that owned child through the adapter/test control path; never search/kill by name.
132. Assert normalized connected→degraded/restarting transition and bounded attempt metadata.
133. Assert the local authenticated HTTP origin remains healthy and bound to the expected project/auth generation.
134. Assert no unrelated process/provider resource is affected.
135. Observe successful reconnection within policy or the exact configured terminal exhaustion; configure the test policy so one deterministic recovery path is expected.
136. After recovery, run public doctor and official client orientation/tool checks again.
137. Perform an intentional tunnel stop and assert no restart occurs.
138. Verify metrics/runtime config/owned child are removed while the local host state follows the intended test sequence.
139. Restart once if needed for final cleanup/stop verification, recording every generation.

### 15. Link GUI multi-project and lifecycle evidence

140. Require the exact reviewed GUI-095 test/report evidence for two projects, bounded auto-start, uniqueness conflicts, isolated failure, renderer reload, secure rotation, doctor rendering, and true-app-quit cleanup.
141. Verify that evidence corresponds to the exact commit/artifact under test.
142. Mark `GUI_MULTI_PROJECT_EVIDENCE_PASS` only when required focused/root tests are green and the report/proof is present.
143. Do not fake a second public endpoint solely to duplicate GUI coverage.
144. If the public run is launched from GUI, record the safe GUI runtime generation/doctor result without capturing the token modal or raw IPC/logs.

### 16. Run secret/canary scans

145. Seed unique canaries for bearer, provider credential content, session id, document phrase, local secret/config path, and generated client config.
146. Collect only surfaces the harness is permitted to inspect: argv/environment metadata, structured events, stdout/stderr buffers, doctor report, GUI safe logs/export where exercised, result/proof files, runtime config, Git diff/status, and ticket/PR artifact staging.
147. Allow only the provider credential **path reference** in the generated cloudflared config where required; never allow credential content or bearer.
148. Require the document canary only inside the disposable board/read-memory path and never retained evidence.
149. Scan raw, encoded, quoted, prefixed, and common serialization variants defined by the canonical redactor test corpus.
150. Fail immediately/classify harness or product leak when any forbidden canary appears.
151. Rewrite no evidence by post-hoc redaction to turn a leak into pass; the source surface must be corrected and the run repeated.
152. Store only a safe scan count/surface list/result.

### 17. Execute idempotent cleanup and prove absence

153. Enter cleanup in `finally` for every exit path.
154. Close all MCP clients/sessions.
155. Stop tunnel and cancel restart timers/health polling.
156. Stop HTTP host and invalidate sessions/verifier.
157. Wait boundedly, then force only exact owned remaining process trees.
158. Release metrics sockets/ports/locks.
159. Remove runtime/provider config, generated client config, token files, temporary provider credential copy if one was created, disposable board/worktrees, output staging temp files, and clipboard fixture.
160. Apply provider-side revoke/delete only when explicit disposable ownership policy authorizes it; otherwise leave pre-provisioned resources intact and record that policy.
161. Verify no owned process, open listener/metrics port, session, restart timer, temp directory, lock, or disposable Git/board state remains.
162. Verify the public MCP endpoint no longer serves the stopped origin according to the provider route/stop contract.
163. Run cleanup a second time and require idempotent success.
164. Make any cleanup failure set `CLEANUP_PASS` fail and overall fail, even after all functional checks passed.
165. Preserve a minimal safe cleanup diagnostic for operator repair.

### 18. Render and retain sanitized evidence

166. Validate the final in-memory result against schema v1.
167. Render Markdown solely from the validated JSON.
168. Include exact commit/artifact/platform/version, safe project/endpoint fingerprints, check results, doctor counts, mutation ids/hashes/versions, generation traces, failure classifications, retry record, cleanup and secret-scan results, and limitations.
169. Exclude raw commands containing secret references where paths are sensitive, raw logs, request/response bodies, complete environment, token/provider/session/document content, and production-identifying details.
170. Run a final canary/forbidden-field scan over the JSON, Markdown, optional JUnit, and artifact directory.
171. Write artifacts atomically only after the final scan passes; on scan failure retain no unsafe artifact.
172. Emit a safe console summary and paths to sanitized artifacts.
173. Link the safe result/proof to the ticket through normal post-implementation reporting, not by copying secrets into board docs.

### 19. Optional protected GitHub Actions workflow

174. Add the manual workflow only after repository owners confirm a protected Environment and suitable runner.
175. Trigger only by `workflow_dispatch`; no PR/push/schedule/fork path.
176. Require explicit full commit/ref and environment acknowledgement inputs.
177. Use least permissions and one named concurrency group with `cancel-in-progress:false` unless environment ownership requires another safe policy.
178. Materialize provider/token references through protected mechanisms with shell echo disabled and no raw output.
179. Checkout/build the exact commit, run canonical script, and always execute cleanup.
180. Upload only artifacts that passed the harness secret scan.
181. Prevent Actions debug/step summaries from echoing secrets or raw provider output.
182. Delete/expire artifacts according to short documented retention.
183. Test workflow syntax and a dry/fake environment path without secrets before enabling the protected environment.
184. If no protected runner/environment exists, omit the workflow and document the canonical local/manual procedure; do not weaken security to include it.

### 20. Final regression and hand-off

185. Run local/fake integration harness tests in normal root verification.
186. Run exact commit root test/typecheck/build/verify, stdio smokes, plugin check where applicable, HTTP/auth/tunnel/doctor/GUI tests, and docs verification.
187. Confirm public integration remains excluded from normal PR/root verify while fake harness tests remain included.
188. Execute at least one complete real public run with overall pass after the reviewed implementation is built.
189. Where environment failure occurs, correct environment and rerun; do not merge on a failed/absent valid public result.
190. Have an independent reviewer inspect code, sanitized result/proof, environment limitations, mutation/gate assertions, rotation/degradation, cleanup, and secret-scan methodology.
191. Run `git diff --check` and confirm no secret/output/fixture file is staged.
192. Attach/link only sanitized evidence and update DOC-013 known limitations/commands if actual behavior differed.
193. Do not merge; hand off to the normal review/verification pipeline.

## Expected files

Add the focused integration types/orchestrator/client/fixture/evidence/cleanup/tests and canonical operator script listed in `files.md`, plus an optional protected manual workflow only when the environment contract exists. Reuse all production modules and avoid any public-test-only protocol/auth/tunnel bypass.

## Acceptance checks

- Exact commit/artifact and all local regressions pass before public startup.
- One disposable project is served through a real named public HTTPS tunnel with standard TLS and no redirect.
- Missing/wrong/query/cookie bearer probes fail identically and valid official-client initialization succeeds.
- Full expected project fingerprint and exact remote-safe tool policy are proven; background dispatch is unavailable.
- Wrong expected project, stale version, and deliberate gate violations fail with no mutation.
- One controlled correct remote mutation succeeds and is read back by hash/version.
- Public sessions close, reject cross-token use, and invalidate on process restart.
- Rotation invalidates old token/sessions and new token/public doctor succeeds.
- Owned tunnel death produces exact degraded/restart/recovery behavior; intentional stop suppresses restart.
- GUI multi-project/quit evidence is linked for the same commit.
- Secret scan and idempotent cleanup pass; either failure makes overall fail.
- Evidence is schema-valid, deterministic, sanitized, and contains no raw logs/secrets/content.
- Real integration is manual/protected and absent from ordinary PR/root verification.

## Verification commands

Use exact scripts established by implementation, including equivalents of:

```bash
npm test
npm run typecheck
npm run build
npm run verify
npm run verify:docs
npm run verify:remote-public -- --commit <FULL_SHA> --config <PROTECTED_CONFIG_REFERENCE> --output <SAFE_OUTPUT_DIR>
git diff --check
git status --short
```

Never put a bearer/provider credential value in the command line. The real command must consume protected references and run only in the controlled environment.

## Failure and deviation rules

- Stop if any predecessor contract/doctor/tool/error differs; update the ticket/harness to the canonical implementation rather than duplicating or bypassing it.
- Stop for dirty/mismatched commit, production path/resource, missing protected environment, insecure TLS, Quick Tunnel, raw secret argument, wrong owner, or ambiguous provider cleanup policy.
- Do not retry deterministic product/security/config/gate/redaction/cleanup failures.
- Do not create/delete provider account/DNS/tunnel resources by default, mutate production boards, expose remote dispatch, add OAuth/multi-board/load scope, or upload raw artifacts.
- Do not merge.

## Stop condition

Stop when one complete real named-tunnel run for the exact reviewed commit passes every required public transport/auth/project/tool/gate/mutation/session/rotation/degradation/GUI-regression/secret-scan/cleanup check, produces only validated sanitized JSON and Markdown evidence, leaves no owned local residue, records any environment limitation honestly, and is ready for independent review and the normal merge/verification process. Do not merge.

## Roadmap amendment — Cloudflare Worker remote-client proof

Use a disposable Worker as an external MCP client only. Store the bearer in a Worker secret binding; initialize the public endpoint, verify project/tools, perform a disposable ticket lifecycle, close the session, capture redacted results, then delete the Worker and secret. Require no Access headers, cookies, redirects, proxy behavior or hosted Kanmer state.
