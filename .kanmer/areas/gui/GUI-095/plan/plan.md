# Plan — GUI-095: secure multi-project remote-access controls

## Objective

Add an Electron GUI workflow that securely configures, starts, monitors, diagnoses, rotates, and stops one remote HTTP+tunnel process per registered project, with operating-system-backed bearer persistence, narrow typed IPC, generation-safe multi-project orchestration, distinct local/tunnel/public health, and no duplicated transport/tunnel/doctor logic.

## Starting state

- DOC-012 defines the remote-access product/security contract.
- MCP-025/026/021 provide HTTP, bearer, and tunnel lifecycle modules/process events.
- MCP-027 provides stable config/local/public doctor reports.
- The GUI already owns project registration, settings, Electron main/preload/renderer boundaries, and child-process conventions.
- DOC-013 will provide final setup/repair manual anchors.

## Required changes

### 1. Inspect current GUI architecture and pin official APIs

1. Read the current project registry/settings storage/migrations, main bootstrap/quit flow, preload bridge, IPC registration/validation, renderer routing/design system, test stack, and process helpers.
2. Read MCP-021/025/026/027 actual exports, schemas, events, error codes, CLIs, and post-implementation reports.
3. Inspect the repository's pinned Electron version and matching official `safeStorage`, contextBridge/IPC, clipboard, and security APIs.
4. Confirm `safeStorage.isEncryptionAvailable()` and selected-backend APIs available in the pinned release.
5. Define which backend values are accepted; explicitly reject a plaintext fallback such as `basic_text` where exposed.
6. Confirm existing application tray/background-versus-quit behavior.
7. Confirm existing renderer route/layout paths and settings component conventions; update `files.md` if canonical paths differ before coding.
8. Stop and amend the plan if secure persistent storage or safe child-process ownership cannot be implemented on a supported platform.

### 2. Define schema-versioned safe settings and runtime types

9. Define per-project remote settings schema v1 keyed by full project fingerprint.
10. Include only fields allowed by `files.md`: desired enabled/auto-start, provider/mode, executable ref, hostname, tunnel id, provider credential-file ref, bearer secret id/fingerprint/timestamps, restart policy, project reference/fingerprint, safe doctor summary/time, config version.
11. Explicitly reject raw token, verifier digest, credential contents, arbitrary cloudflared args/YAML, PID, port, session id, runtime generation/status, and unknown fields.
12. Define draft types separately from validated persisted config.
13. Define safe runtime status as local/tunnel/public dimensions plus project/config/runtime generations, action state, redacted first failure/repair, and bounded events.
14. Define request/result/error unions for every IPC operation.
15. Define one-time token delivery with delivery id, expiry, raw token, fingerprint, purpose (`generated|rotated`), and project fingerprint; prohibit persistence/ordinary serialization.
16. Define schema migration result and optimistic config version.
17. Reuse browser-safe types from MCP packages only when package boundaries/bundling remain valid; otherwise map through explicit safe DTOs.
18. Add compile-time/type-level tests or exhaustive switches for states/actions.

### 3. Implement non-secret settings storage

19. Extend the canonical GUI settings store rather than create a competing database.
20. Store remote configurations under one schema-versioned key/map keyed by project fingerprint.
21. Validate/migrate existing/absent data atomically on load.
22. Quarantine/report corrupt entries without discarding unrelated project settings.
23. Implement atomic write using existing temp/flush/replace/backup conventions.
24. Require expected config version for save/remove/reconcile mutations.
25. Validate the referenced project is registered and fingerprint matches.
26. Validate hostname/tunnel id/provider credential/secret id uniqueness across all project configs.
27. Permit explicit path reconciliation only when a freshly resolved full fingerprint matches the existing key.
28. Preserve missing-project config as disabled/error state instead of deleting it.
29. Store only safe last doctor summary/check/time; full report remains runtime/export data according to existing retention policy.
30. Add migration/round-trip/atomic-failure/version-conflict/unknown-field/corruption/uniqueness/move/mismatch/no-secret tests.

### 4. Implement secure bearer record storage

31. Create/reuse an app-owned secrets location outside project/repository/board paths.
32. On initialization, query `safeStorage.isEncryptionAvailable()` and selected backend where supported.
33. Classify backend as secure/blocked/unknown according to accepted platform policy.
34. Do not create/persist a bearer record if unavailable or blocked.
35. Generate token/verifier through MCP-026's canonical helper in main only.
36. Encrypt the raw token with `safeStorage.encryptString` in main.
37. Persist ciphertext plus opaque secret id/safe fingerprint/timestamps/backend metadata atomically with restrictive file permissions where supported.
38. Keep raw token out of ordinary settings and logs.
39. Implement decrypt-by-secret-id only for explicit start/doctor/token-delivery/rotation calls.
40. Verify decrypted token format/fingerprint before use; corrupted/mismatched records fail with a coded blocker and are never silently replaced.
41. Implement explicit record delete after remote config removal/revocation confirmation, with rollback ordering that does not orphan an active config.
42. Do not expose a generic list/read/decrypt secret API to preload/renderer.
43. Test secure/unavailable/basic-text/unknown backend, encrypt/decrypt, corrupt ciphertext, wrong metadata, atomic failure, delete failure, path permissions, and canary-free safe serialization.

### 5. Implement one-time token delivery

44. After successful protected persistence, create an in-memory delivery record with random id, project, purpose, token, expiry, and unconsumed state.
45. Return it only from explicit generate/rotate IPC response to the initiating validated renderer frame.
46. Do not make it available through `get`, list, status, event subscription, doctor, reload recovery, or another renderer/window.
47. Mark delivery consumed/cleared when the modal closes/completes, on expiry, renderer destruction, project removal, rotation replacement, or app quit.
48. A repeated/expired/wrong-project delivery id returns a generic coded failure and no token.
49. Clear mutable buffers/references best-effort after consumption/expiry.
50. Ensure telemetry/console/error serialization never receives the raw delivery object.
51. Add tests for first delivery, second read refusal, expiry, renderer reload/destroy, wrong project/frame, rotation replacement, and canary absence outside the explicit response.

### 6. Define narrow preload/IPC API

52. Add only the named operations listed in `files.md`; expose no raw `ipcRenderer` or generic channel invocation.
53. Freeze the bridge object and return an unsubscribe function for status events.
54. Validate sender webContents/frame/origin according to existing Electron security conventions on every call.
55. Validate all request schemas and reject unknown fields before service access.
56. Require full project fingerprint for every project-scoped call.
57. Require expected config version for save/remove and current runtime generation for stop/cancel where applicable.
58. Return coded safe results rather than throwing arbitrary child/settings objects across IPC.
59. Send only allowlisted safe status/event/report DTOs to renderer.
60. Raw token may cross only the explicit one-time generate/rotate response.
61. Prevent arbitrary executable/path/URL fetch/shell/secret-store operations.
62. Add IPC tests for forged sender/frame, malformed/unknown fields, wrong fingerprint/version/generation, unsubscribed listener, stale delivery, and secret/error redaction.

### 7. Implement per-project runtime manager

63. Create one runtime record map keyed by project fingerprint.
64. Store desired config/version, current runtime generation, current serialized operation, abort/cleanup handles, owned remote-host child/library handle, auth generation/fingerprint, safe statuses, doctor summary/report handle, and bounded events.
65. Use a per-project promise queue/mutex so save/start/stop/rotate/remove/doctor actions cannot overlap unsafely.
66. Assign a new monotonic/random runtime generation for each start lifecycle.
67. Tag every child/doctor/event callback with project/config/runtime generation.
68. Ignore stale callbacks and record them only in debug-safe tests where useful.
69. Make start/stop idempotent for the same generation/state.
70. Return current action/status instead of spawning duplicates.
71. Keep runtime state in main only; renderer can subscribe/read safe snapshots.
72. Add reducer/manager tests for every valid/invalid transition and stale callback.

### 8. Validate draft/save configuration through canonical modules

73. Resolve project and full fingerprint through existing project registry/store status.
74. Map GUI draft to MCP-021/025/026 canonical config validators.
75. Validate executable/version, provider mode, tunnel id, credential-file reference, hostname, restart policy, loopback/HTTP defaults, and secure bearer availability.
76. Invoke MCP-027 config-mode checks for the complete draft where practical.
77. Return all field/check errors in stable order without spawning.
78. Recheck cross-project hostname/tunnel/secret uniqueness under the settings write lock.
79. Save only when all required validation passes and expected version matches.
80. If editing a running project's material config, require/perform controlled stop before commit/restart; never hot-switch a public endpoint to another project.
81. Add tests for each invalid field, canonical validator disagreement, duplicate resources, stale version, running edit, and no-process side effects.

### 9. Start one project securely

82. Serialize through the project queue and re-read current config/version/project fingerprint.
83. Refuse missing/moved/mismatched project, invalid/duplicate config, unsafe secret backend, corrupt/missing bearer, invalid provider credential, or existing owner.
84. Detect existing GUI/headless ownership through the canonical remote-host ownership/status mechanism; do not trust PID alone or kill it.
85. Decrypt the bearer in main, verify its fingerprint, and derive the MCP-026 verifier.
86. Prepare protected process delivery: inherited IPC/anonymous pipe preferred; approved verifier-only environment fallback allowed; raw token never argv/settings/logs.
87. Spawn/call the canonical remote-host composition from MCP-021, not cloudflared directly.
88. Pass project root/fingerprint, validated non-secret config, provider credential reference, verifier delivery, generation, and event channel.
89. Parse only machine-readable ready/status events and reject malformed/secret-bearing output.
90. Update local status through validating/starting/ready, then tunnel status through starting/connected/degraded/restart/failed.
91. Clear decrypted raw token/reference after verifier/process setup.
92. On cancellation/failure at any phase, call canonical cleanup, wait boundedly, force only the owned tree if required, remove runtime resources, and publish one safe failure.
93. Once provider-connected, set public status `not-run`/`stale`; do not call it verified based on process readiness.
94. Add fake-process tests for every phase/failure/cancel/timeout/malformed event/canary/orphan path.

### 10. Multi-project auto-start and conflict control

95. At app readiness after settings/project registry load, collect enabled auto-start configs in deterministic project order.
96. Validate each before queueing; report failures independently.
97. Use a global semaphore with maximum two concurrent starts.
98. Maintain per-project serialization within the global cap.
99. Before each queued start, recheck config/project/ownership/secret state.
100. One failure must release its slot and not cancel other projects.
101. Reject configurations sharing hostname/tunnel id or other exclusive provider identity before any competing spawn.
102. Do not pre-decrypt secrets for projects waiting in the queue.
103. Cancel pending starts cleanly during app quit or config disable.
104. Add tests with zero/one/many projects, deterministic order, max concurrency, isolated failure, duplicate conflict, quit cancellation, and stale config changes.

### 11. Stop, remove, app quit, and ownership

105. Stop serializes on the project queue and targets the exact owned generation.
106. Ask canonical remote host to stop tunnel first then HTTP/session lifecycle.
107. Await bounded graceful cleanup; escalate only against the exact owned process tree.
108. Clear runtime handles/status to stopped and publish final safe event.
109. Ignore stale stop requests for older generation.
110. Remove configuration only after explicit confirmation and a successful stop/no-owner state.
111. Delete bearer record only after settings removal transaction succeeds or use a recoverable two-phase order defined by existing settings store.
112. Never delete external cloudflared credential files automatically.
113. On true application quit, block/coordinate existing quit flow, stop all GUI-owned projects with a global deadline, force remaining owned trees, clear deliveries/clipboard timers, then continue quit.
114. Renderer/window close/reload does not stop processes unless it is the application's actual quit policy.
115. Add tests for stop during each phase, repeated stop, forced cleanup, unrelated process survival, remove rollback, renderer reload, window close, tray/background behavior, and app quit no-orphan proof.

### 12. Run and render connector doctor

116. Invoke MCP-027 library/JSON CLI through main with the selected project config and protected token provider.
117. Serialize doctor per project against conflicting start/stop/rotate actions; config mode may run stopped, local/public modes require appropriate status.
118. Pass raw token only inside trusted main/library scope or protected inherited channel, never renderer/argv.
119. Stream a safe progress/status event by check id if the doctor API supports it; otherwise show bounded phase progress.
120. Store/render full safe report in runtime memory and persist only approved summary/time.
121. Map check ids to status groups and DOC-013 repair anchors.
122. Set public status verified only when required public checks pass for current project/config/runtime/auth generation.
123. Mark previous verification stale after restart, config/hostname/tunnel/token/project generation change, or age threshold defined by FRD/manual.
124. Add tests for healthy/multi-failure/skips/cancel/stale report/old generation/redaction and no board mutation.

### 13. Rotate bearer safely

125. Require explicit confirmation naming project and session-disconnect/client-update consequence.
126. Serialize rotation and refuse/coordinate conflicting doctor/start/stop.
127. Generate new token/verifier and persist ciphertext first through the secure store.
128. If persistence fails, keep old record/config/runtime untouched.
129. Apply MCP-026 rotation to running remote host or perform the accepted transactional restart path.
130. Invalidate old sessions and update runtime auth generation.
131. Update settings safe secret id/fingerprint/timestamps atomically.
132. On any post-persistence activation failure, execute the accepted rollback/fail-safe stop and retain both records only as needed for recovery without exposing either.
133. Create one-time delivery for the new token only after the active/persisted state is unambiguous.
134. Mark public verification stale and prompt/update clients.
135. Delete old encrypted record only after success and recovery boundary completion.
136. Add tests for success, persistence failure, activation failure, invalidation failure, restart path, settings failure, delivery expiry, old/new token behavior, and canary redaction.

### 14. Implement sensitive clipboard handling

137. Add a narrow main/preload operation to copy the current one-time delivery token only after delivery-id/project/frame validation, or perform copy in renderer only if existing security architecture requires it and no logs/state retain the value.
138. Start a 60-second timer tied to delivery/project.
139. At expiry, read clipboard once and clear only when it exactly equals the copied token.
140. If user replaced clipboard content, leave it untouched.
141. Cancel/replace prior token clear timer safely.
142. Clear timer/delivery references on completion/expiry/app quit.
143. Never read/log unrelated clipboard text.
144. Add fake clipboard/clock tests for unchanged/replaced/multiple-copy/quit/expiry and canary leakage.

### 15. Build renderer overview and status components

145. Add Remote Access navigation using existing router/layout patterns.
146. Load all registered projects and main-process safe snapshots.
147. Render one card per project with name/id/safe path, desired state, three health dimensions, hostname, last doctor, first repair, and context-appropriate primary action.
148. Render configured/stopped/starting/connected-unverified/verified/degraded/restarting/failed/stopping/missing-project states exactly.
149. Disable duplicate/unsafe actions while a project operation is active.
150. Keep one project's progress/failure independent of other cards.
151. Subscribe once and unsubscribe on unmount/reload; merge events only by matching generations.
152. Add accessible names/status text/live announcements, keyboard order, focus preservation, and non-color semantics.
153. Test every state, empty/loading/error/many-project layout, stale events, and accessibility queries.

### 16. Build project setup/detail workflow

154. Implement staged provider→executable→named tunnel→bearer→review flow.
155. Use canonical validation results for fields and show all blocking errors in stable order.
156. Show provider-neutral labels/structure with cloudflared-specific fields only when selected.
157. Use file selection through an existing narrow main dialog API; renderer receives path reference only, not file contents.
158. Show secure-storage backend/blocker truthfully.
159. Generate token only after explicit action; never auto-generate on page load.
160. Review screen shows full project fingerprint-safe representation, endpoint, provider mode, auto-start, and security consequences.
161. Save with expected config version; handle conflict by reloading and requiring user review, not overwriting.
162. Editing material running config requires confirmation and controlled stop/restart.
163. Add remove/reconcile project confirmations and provider credential reference behavior.
164. Test all stages, validation, back/forward state, version conflict, running edit, secure-storage blocker, and project mismatch.

### 17. Build token modal and diagnostics

165. Open token modal only from the one-time delivery response.
166. Mask by default; reveal/copy are explicit and keyboard/screen-reader accessible.
167. Display authority/clipboard history/client update warning and fingerprint/project.
168. Close/complete invalidates delivery and removes token from component/reducer/DOM references.
169. Do not include token in snapshots, analytics, error boundaries, route state, query strings, local/session storage, or debug logs.
170. Render doctor report grouped by configuration/local/tunnel/public/safety with exact status/check id/summary/repair.
171. Render bounded redacted event timeline separately from raw child output.
172. Provide safe copy/export of endpoint/report only after main-process redaction; never include token/provider credential contents.
173. Add DOM/memory/snapshot/event/export canary tests before/during/after modal.

### 18. Lifecycle, renderer recovery, and diagnostics integrity

174. On renderer load/reload, fetch current main snapshots and subscribe; do not auto-trigger start.
175. Reconcile race between initial snapshot and events with sequence/generation ids.
176. Ignore stale config/runtime/doctor results.
177. Main continues owning processes if renderer crashes/reloads and exposes current state to the replacement renderer.
178. Error boundaries/uncaught handlers serialize only safe error codes/messages.
179. Keep per-project event ring bounded and allowlisted.
180. Verify status never derives from persisted connected/PID/port values.
181. Add renderer reload/crash, duplicate subscription, event race, stale doctor, and safe error tests.

### 19. Integration, accessibility, and security verification

182. Create a full fake remote-host/doctor fixture using real IPC/preload/main manager and no public network.
183. Run configure→generate→one-time reveal/copy→save→start→local ready→tunnel connected→public doctor verified→rotate→new delivery→old session invalidation evidence→stop.
184. Run two projects with auto-start cap, isolated failure, unique hostnames, and independent statuses.
185. Run missing/moved/wrong-fingerprint/duplicate headless owner flows.
186. Reload renderer during running state and prove no duplicate child.
187. Quit app with multiple active projects and prove no owned process/config/secret-delivery residue.
188. Test secure-storage unavailable/basic-text/corrupt record and no plaintext fallback.
189. Scan settings/ciphertext metadata/IPC/events/DOM after close/logs/process args/env/doctor/export/snapshots/clipboard for canary secret.
190. Confirm context isolation/no Node integration and narrow bridge through existing Electron security tests.
191. Run keyboard/screen-reader labels/focus/live-region/contrast/responsive checks using existing GUI tooling.
192. If screenshot/visual smoke exists, capture only non-secret states and ensure token modal fixture uses a synthetic redacted value not a live secret.

### 20. Documentation, packaging, and root verification

193. Link UI help/repair actions to actual DOC-013 anchors when available; use temporary ticket ids only until manual lands.
194. Update GUI functional docs only if the accepted FRD requires a screen map/state table amendment.
195. Confirm no MCP tool/reference/count/plugin change.
196. Add no native dependency unless safeStorage is proven insufficient and architecture is re-approved.
197. Run focused main/preload/renderer tests, typecheck, GUI build, Electron integration smoke.
198. Run MCP remote-host/auth/tunnel/doctor regression tests through root verify.
199. Run Windows PR verification and other supported GUI platform checks.
200. Run `git diff --check`; inspect app-data test dirs/process table/temp configs/clipboard fixture/settings for residue.
201. Record backend policy, persisted schema, IPC methods, multi-project concurrency, lifecycle traces, doctor/rotation/quit proof, accessibility results, and canary scan in post-implementation report.

## Expected files

Use the canonical GUI main/preload/renderer/settings/process structures discovered at implementation. Add the focused `remoteAccess` modules/components/tests listed in `files.md` only where an equivalent does not exist. Reuse MCP remote-host/doctor/auth/tunnel code and existing GUI design/system helpers.

## Acceptance checks

- Every registered project has an independent fingerprint-bound configuration/status.
- At most one GUI-owned runtime per project; multiple projects start with bounded concurrency and failure isolation.
- `safeStorage` persists bearer only on approved secure backend; no plaintext fallback.
- Ordinary settings/IPC/events/status contain no raw token/verifier/provider credentials/runtime truth.
- Renderer receives raw bearer only in explicit expiring one-time delivery.
- Main owns all secrets/processes/doctor and the preload is narrow/validated.
- Start uses canonical remote host; connected and verified are distinct.
- Doctor/rotation/project/config generations prevent stale or cross-project results.
- Clipboard clear never erases a newer user value.
- Renderer reload does not duplicate or kill processes; true app quit leaves no owned children.
- UI covers all states, confirmations, repairs, accessibility, and multi-project conflicts.
- Full integration and canary/security/root verification pass without public credentials.

## Verification commands

Use exact repository scripts, including equivalents of:

```bash
npm --workspace apps/gui test
npm --workspace apps/gui run typecheck
npm --workspace apps/gui run build
npm test
npm run typecheck
npm run build
npm run verify
git diff --check
git status --short
```

Run the canonical Electron integration/smoke command with fake remote host/doctor/provider and supported secure-storage mocks. Do not use real Cloudflare credentials in PR CI.

## Failure and deviation rules

- Stop if the pinned Electron safeStorage backend cannot satisfy the accepted platform policy; do not add plaintext fallback.
- Stop if predecessor APIs require duplicating tunnel/auth/doctor logic or passing raw token in argv; correct the boundary first.
- Do not create provider resources/downloads, Quick Tunnel production, system service, remote dispatch, OAuth, multi-board endpoint, renderer process access, generic IPC, force takeover, or persisted runtime truth.
- Do not merge; hand off for independent Electron security/accessibility/process review.

## Stop condition

Stop when the built GUI can securely configure and operate independent remote access for multiple registered projects using OS-backed bearer storage, narrow IPC, canonical remote-host/doctor modules, generation-safe process ownership, distinct connected/verified health, safe token delivery/rotation/clipboard handling, complete stop/quit cleanup, accessible tested UI, no canary leakage, and a review-ready PR. Do not merge.

## Roadmap amendment — split provider lifecycles

GUI-095 owns only the named Cloudflare Tunnel path: executable reference, tunnel identity, exact hostname, credential-file reference, Kanmer bearer lifecycle, doctor/status and per-project start/stop. Exclude OpenAI tunnel-client/profile management; that work moves to [[GUI-104]]. Exclude Access, account/DNS automation, Quick Tunnels, remote-managed tokens and Worker-hosted MCP.
