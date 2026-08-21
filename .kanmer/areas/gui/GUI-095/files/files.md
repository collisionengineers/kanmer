# Files — GUI-095

## Add — main process

| Path | Exact responsibility |
|---|---|
| `apps/gui/src/main/remoteAccess/types.ts` | GUI-owned schema-v1 per-project persisted settings, safe metadata, draft/validation/result/status/event/action types, config versions, one-time token delivery type, and typed IPC contracts. Reuse MCP package types where browser-safe; never import raw secret/process implementation into renderer. |
| `apps/gui/src/main/remoteAccess/secrets.ts` | Electron-main-only bearer persistence through official `safeStorage`: backend availability/safety checks, encrypt/decrypt/delete, atomic ciphertext record storage, safe metadata, corruption handling, one-time delivery expiry, best-effort secret scoping, and no plaintext fallback. |
| `apps/gui/src/main/remoteAccess/settings.ts` | Atomic schema-versioned non-secret remote settings per project fingerprint, migration/validation, optimistic versions, uniqueness checks across hostnames/tunnel ids/secret refs, missing-project reconciliation, and no persisted runtime truth. Reuse the existing settings store if it already provides these facilities. |
| `apps/gui/src/main/remoteAccess/manager.ts` | One runtime record/action queue per project; bounded multi-project auto-start; validate/decrypt/derive/spawn canonical remote host; parse generation-aware events; run doctor; rotate/stop/remove; detect duplicate headless ownership; quit cleanup; never expose raw child output/secret to renderer. |
| `apps/gui/src/main/remoteAccess/ipc.ts` | Register narrow validated sender/project/version/state IPC methods and subscription cleanup. If the app centralizes handlers in `apps/gui/src/main/ipc.ts`, place handlers there and keep this file as pure service bindings or omit it—never register duplicates. |
| `apps/gui/src/main/remoteAccess/secrets.test.ts` | Mocked official safeStorage/backend/ciphertext/corruption/atomic-write/one-time-delivery/canary/clipboard-secret lifecycle tests. |
| `apps/gui/src/main/remoteAccess/settings.test.ts` | Schema/migration/version/uniqueness/project-move/missing-project/atomic-write/no-secret tests. |
| `apps/gui/src/main/remoteAccess/manager.test.ts` | Fake remote-host/doctor/process/clock tests for per-project serialization, two-project concurrency, generation/stale events, auto-start cap, failure isolation, rotate, duplicate owner, stop/quit/orphan cleanup, and canary redaction. |

## Add — renderer

| Path | Exact responsibility |
|---|---|
| `apps/gui/src/renderer/src/components/RemoteAccessOverview.tsx` | List every registered project with separate local/tunnel/public status, safe endpoint/last doctor/primary action, loading/error/empty states, and navigation to detail. Use the canonical renderer path if this project omits the second `src/`. |
| `apps/gui/src/renderer/src/components/RemoteAccessProjectPanel.tsx` | Project detail and staged provider/executable/named-tunnel/hostname/credential/bearer/auto-start setup; save/version conflict; start/stop/doctor/rotate/remove; first failing layer and repair; bounded event timeline. |
| `apps/gui/src/renderer/src/components/RemoteAccessTokenModal.tsx` | Explicit one-time masked reveal/copy/complete-delivery UI for generated/rotated bearer; consequence text, accessible controls, close cleanup, and no persistence/snapshot logging. |
| `apps/gui/src/renderer/src/components/RemoteAccessStatus.tsx` | Shared accessible status presentation for local/tunnel/public dimensions and progress/restart details; text/icon semantics, not color alone. |
| `apps/gui/src/renderer/src/components/RemoteAccessDiagnostics.tsx` | Render MCP-027 structured doctor checks/repairs and bounded redacted events; never raw child stderr or secret fields. |
| `apps/gui/src/renderer/src/remoteAccess/state.ts` | Generation-aware reducer/selectors/view models, form draft validation state, optimistic action state, subscriptions, stale-event rejection, and secret-delivery removal from memory. |
| `apps/gui/src/renderer/src/remoteAccess/state.test.ts` | Reducer/state-transition/stale-generation/two-project/token-modal-close/doctor rendering tests. |
| `apps/gui/src/renderer/src/components/RemoteAccessProjectPanel.test.tsx` | Component/accessibility/form/confirmation/action-state/error/version-conflict tests using the repository's existing renderer test stack. |

## Modify

| Path | Exact responsibility |
|---|---|
| `apps/gui/src/main/index.ts` | Initialize remote settings/secrets/manager after app readiness, register IPC, run bounded auto-start, integrate application quit cleanup, and keep renderer/window lifecycle separate from child ownership. |
| `apps/gui/src/main/ipc.ts` | Add the narrow remote-access handlers only if this is the canonical central registry; validate sender/frame and use service methods, not filesystem/process primitives. |
| `apps/gui/src/preload/index.ts` | Expose a frozen typed `remoteAccess` API with named operations and unsubscribable event listener; never expose `ipcRenderer`, arbitrary invoke, filesystem, process, token store, or shell. |
| `apps/gui/src/preload/index.d.ts` | Declare exact renderer-visible safe request/result/status/report types; raw token appears only in the explicit one-time delivery response type. Use the actual global declaration file if named differently. |
| `apps/gui/src/renderer/src/App.tsx` | Add the Remote Access route/navigation and project detail integration without changing unrelated screens. Use the canonical router/layout file if navigation is elsewhere. |
| `apps/gui/src/renderer/src/styles.css` | Add design-token-based responsive/accessible overview, status, form, modal, diagnostics, and event styles; avoid one-off duplicate selectors and preserve GUI-082 cleanup direction. |
| `apps/gui/src/renderer/src/App.test.tsx` | Add navigation/overview integration only if this is the canonical app test; keep detailed behavior in focused tests. |
| `apps/gui/package.json` | Add no native secret dependency unless official safeStorage cannot satisfy the accepted platform contract. Wire tests/smokes through existing scripts. |
| `package.json` | Ensure GUI tests/build/typecheck are reached by root verify once. |
| `scripts/verify.mjs` | Confirm GUI main/renderer/preload/unit/integration checks are part of the shared rail; no duplicate remote smoke. |
| `docs/functional/frd/FRD-025-remote-access.md` | Consume accepted GUI/security requirements; modify only through approved correction. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `apps/gui/src/main/settings.ts` or current settings store | Reuse atomic storage/migration/app-data conventions; do not create a second unrelated settings database. |
| `apps/gui/src/main/kanmerGit.ts` and existing process helpers | Reuse safe child/process-tree/path/error patterns where suitable. |
| `apps/gui/src/main/provider*.ts` / Connect settings modules | Reuse project/provider list, managed configuration, confirmations, and settings UI conventions. |
| `apps/gui/src/main/notifications.ts` | Optional status notification convention; do not add noisy notification scope without accepted requirement. |
| `apps/gui/src/renderer/src/components/` existing settings/project components | Match design system, field, button, modal, error, and accessibility patterns. |
| `packages/mcp-server/src/remote-host.ts` | Canonical HTTP+tunnel lifecycle and machine-readable status. GUI never reimplements cloudflared or MCP framing. |
| `packages/mcp-server/src/http-auth.ts` | Token generation/verifier/rotation primitives. |
| `packages/mcp-server/src/doctor/index.ts` and types | Canonical report/check execution; GUI renders stable ids/results and does not duplicate probes. |
| `packages/mcp-server/src/tunnels/types.ts` | Canonical provider/status/config validation types. |
| `docs/manual/` | DOC-013 supplies user setup/repair anchors consumed by UI help links. |
| Electron official `safeStorage`, IPC/context isolation, clipboard, and security guidance | Re-check against the repository's pinned Electron version before implementation. |
| `.github/workflows/pr.yml` | GUI tests use fakes/local loopback; no real Cloudflare credential/public endpoint in PR CI. |

## Persisted settings contract

Per project fingerprint, ordinary settings may contain:

- schema/config version;
- enabled/auto-start desired state;
- provider and exact mode;
- cloudflared executable reference;
- public hostname and named tunnel id;
- provider credential-file reference;
- opaque bearer secret record id plus safe fingerprint/timestamps;
- restart policy and safe last doctor summary/time;
- project registry id/path reference and expected fingerprint.

They must not contain raw bearer, verifier digest, safeStorage plaintext, provider credential content, runtime port/PID, full session id, arbitrary provider args/YAML, or persisted `connected` truth.

## IPC contract

Expose only named project-scoped operations:

- list/get/validateDraft/save;
- generateBearer/completeBearerDelivery/rotateBearer;
- start/stop/runDoctor/getStatus;
- subscribe/unsubscribe;
- remove/reconcileProject.

Every mutator validates full fingerprint, expected config version, current generation/state, sender/frame, and unknown fields.

## Do not modify

- Add plaintext secret fallback, raw token settings/argv/logs, generic renderer secret/process/filesystem/shell/fetch IPC, provider credential import, cloudflared spawning in renderer, or duplicated doctor/tunnel/auth logic.
- Create account/tunnel/DNS resources, executable download, Quick Tunnel production, OAuth, multi-board endpoint, system service, or remote dispatch.
- Persist runtime connected/PID/port/session state as truth.
- Force takeover/kill unrelated headless processes.
- Keep GUI-owned tunnel alive after the application truly exits.
- Hand-edit MCP plugin bundle.

## Code-grounded survey — current checkout

The original surface above is a target shape. The current canonical paths and their implementation risks are:

### Where the change lands

| Path | Why |
|---|---|
| apps/gui/src/main/remoteAccess/types.ts (new) | Main-owned persisted schema, full project identity, draft/result/status/event/action DTOs, config/runtime/auth generations, and one-time delivery types. Risk: accidentally making raw token, verifier digest, provider credential bytes, PID, port, or session id serializable. |
| apps/gui/src/main/remoteAccess/secrets.ts (new) | Electron safeStorage availability/backend policy, ciphertext record I/O, atomic update/delete, opaque ids, fingerprint metadata, corruption handling, and short-lived delivery records. Risk: plaintext fallback, writes under repo/board, or token persistence in ordinary settings. |
| apps/gui/src/main/remoteAccess/settings.ts (new or extension of apps/gui/src/main/settings.ts) | Per-project schema-versioned settings and registry reconciliation. The existing settings module is app-global direct JSON; choose one canonical owner and do not create two competing settings stores. Risk: path-only identity, non-atomic writes, or dropping missing projects. |
| apps/gui/src/main/remoteAccess/manager.ts (new) | One serialized action queue/runtime record per project fingerprint; bounded auto-start; canonical remote-host and MCP-027 doctor integration; generation-safe events; duplicate-owner detection; true-quit cleanup. Risk: spawning cloudflared directly, overlapping rotate/start/stop, swallowing failures, or allowing stale events to overwrite a newer generation. |
| apps/gui/src/main/remoteAccess/ipc.ts (new service bindings, not a second handler registry) | Narrow validated remote operations and event subscription. If main/index.ts remains the canonical ipcMain registry, this module should only bind services or expose handler factories. Risk: duplicate registration or generic invoke passthrough. |
| apps/gui/src/main/index.ts | Initialize remote services after app ready, register the canonical IPC handlers, pass sourceRoot/boardRoot/repoRoot identity, auto-start in bounded order, and stop all owned hosts during will-quit/update cleanup. Risk: remote startup before app/safeStorage readiness, stopping on renderer close, or leaking contexts on project close. |
| apps/gui/src/shared/ipc.ts | Add named CH values and safe request/result/status/event types; preserve existing projectId-first API convention while adding full fingerprint checks. Risk: one broad remote command or raw token in a routine DTO. |
| apps/gui/src/preload/index.ts and apps/gui/src/preload/index.d.ts | Expose only frozen named remoteAccess methods and unsubscribable events. Risk: leaking ipcRenderer, secret store, process, arbitrary shell/fetch, or delivery token through get/list/status. |
| apps/gui/src/renderer/src/App.tsx | Add entry/navigation and route the machine-level remote overview while preserving active board tab state and dirty-editor guards. Risk: tying remote manager lifetime to renderer route or active project only. |
| apps/gui/src/renderer/src/components/Settings.tsx | Add a Cloudflare-only Remote Access section or navigation entry; keep existing AI Connect host registration separate and link GUI-104 for OpenAI profiles. Risk: mixing provider lifecycle with current agent Connect buttons and global Save/Cancel board modal semantics. |
| apps/gui/src/renderer/src/components/RemoteAccessOverview.tsx, RemoteAccessProjectPanel.tsx, RemoteAccessStatus.tsx, RemoteAccessDiagnostics.tsx, RemoteAccessTokenModal.tsx (new) | Accessible project list/detail/status/doctor/token delivery UI. Risk: single boolean health, raw diagnostics, token retained after close, or actions that ignore config/runtime generations. |
| apps/gui/src/renderer/src/remoteAccess/state.ts and focused tests (new) | Generation-aware renderer view state, subscription/unsubscribe, optimistic action state, draft validation, and token-memory cleanup. Risk: stale event acceptance or token in reducer/snapshot/localStorage. |
| apps/gui/src/main/remoteAccess/*.test.ts and renderer tests (new) | Fake safeStorage/remote-host/doctor/provider/clock/clipboard tests and component/accessibility tests. Risk: only testing pure UI while missing process ownership and redaction. |
| packages/mcp-server/src/remote-host.ts, tunnels/types.ts, tunnels/cloudflared.ts, http-auth.ts, http-secret.ts, doctor modules | Inspect/reuse canonical remote lifecycle/auth/doctor APIs; do not fork them into GUI. Any adapter API change belongs to MCP-021 follow-up scope and must be linked, not absorbed. |
| apps/gui/src/main/updater.ts and existing quit/dispatch helpers | Coordinate owned remote-host shutdown with updater install and app quit; preserve agent-session/update gates. Risk: a downloaded update or app quit leaves GUI-owned children behind. |
| package.json and existing workspace scripts | Add focused tests/build/typecheck to the real existing rail. scripts/verify.mjs and .github/workflows/pr.yml named in the old plan do not exist in this checkout. |

### Context files

| Path | What it tells the implementer |
|---|---|
| docs/functional/frd/FRD-025-remote-access.md | Normative one-project loopback HTTP, bearer-first, tunnel, doctor, redaction, status, GUI, and non-goal requirements. |
| docs/architecture/adr/ADR-0017-streamable-http-remote-access.md | Architecture boundary: HTTP/stdio share one registry; tunnel is an adapter; one process owns one project; GUI does not frame MCP. |
| docs/functional/frd/FRD-019-gui-shell.md | Existing multi-project tab, dirty-editor guard, renderer/main lifecycle, and projectId IPC conventions. |
| docs/functional/frd/FRD-020-board-git-worktree-sync.md | sourceRoot versus boardRoot split, board-worktree behavior, non-Git fallback, and registration paths. |
| docs/functional/frd/FRD-021-auto-update.md | Update restart is gated; install may terminate installed MCP sessions; true quit and updater paths must be coordinated with remote children. |
| apps/gui/src/main/index.ts | Actual context map, open/close project lifecycle, IPC registry, BrowserWindow construction, app ready and will-quit behavior. |
| apps/gui/src/main/settings.ts | Existing global settings schema, direct write behavior, recent/open project lists, and lack of project registry/remote namespace. |
| apps/gui/src/shared/ipc.ts | Existing CH/KanmerApi naming and projectId threading; use it to define the narrow remote surface. |
| apps/gui/src/preload/index.ts | Existing invoke/listener wrapping and unsubscribe pattern; no generic IPC may be added. |
| apps/gui/src/renderer/src/App.tsx | Active tab state, open/close project flow, settings modal entry, dirty-editor navigation guard, and render lifecycle. |
| apps/gui/src/renderer/src/components/Settings.tsx | Existing Settings modal/rail and Connect tab; keep AI host registration separate from remote tunnel configuration. |
| packages/mcp-server/src/project-identity.ts | Canonical fingerprint payload and path normalization; GUI must bind to the same identity semantics or expose a main-process bridge. |
| packages/mcp-server/src/tunnels/types.ts | Provider-neutral TunnelAdapter/TunnelProcess/status/doctor types; no provider credential material crosses this boundary. |
| packages/mcp-server/src/tunnels/cloudflared.ts and cloudflared-config.ts | Cloudflared validation, generated ingress, process environment/args, readiness, status transitions, diagnostics, and bounded cleanup. |
| packages/mcp-server/src/remote-host.ts | Canonical local HTTP + tunnel supervisor composition, protected local verification seam, health monitor, stop order, and status dimensions. |
| packages/mcp-server/src/http-auth.ts and http-secret.ts | Bearer generation/verifier/rotation and protected token-file material; raw token must remain main-only and short-lived. |
| packages/mcp-server/src/http-diagnostics.ts | Safe diagnostic message redaction; GUI should forward allowlisted structured results, not arbitrary errors. |
| node_modules/electron/electron.d.ts (Electron 31.3.0) | Pinned safeStorage and BrowserWindow security API availability/defaults; reject basic_text and do not call setUsePlainTextEncryption. |
| apps/gui/package.json and electron.vite.config.ts | Electron 31.3.0, current test/build/typecheck commands, and bundling/externalization constraints for any new runtime dependency. |

## Ripple effects

- Add main/preload/shared/renderer tests to the existing GUI Vitest suite and ensure root npm test/typecheck/build reach them.
- Add a fake-provider/loopback Electron or main-process integration smoke with no real Cloudflare credentials; preserve MCP stdio/HTTP/protocol/discovery smokes and prove tool count/plugin bundle unchanged.
- Revisit packaged artifact checks so safeStorage/remote manager modules and any runtime dependencies are in the Electron artifact; do not hand-edit the standalone MCP plugin bundle.
- Update DOC-013/manual anchors when that ticket lands; GUI-095 should link to stable anchors rather than embedding provider setup recipes.
- Record configuration schema, backend policy, IPC methods, concurrency/lifecycle, doctor/rotation/quit, accessibility, redaction/canary, and packaging evidence in post-implementation-report.
- MCP-028 consumes this work for integrated disposable remote-client proof; GUI-104 remains a separate provider workflow.

## Out of scope

- OpenAI Secure MCP Tunnel profile lifecycle (GUI-104), OAuth/OIDC, Access policies, account/DNS provisioning, Quick Tunnels, Worker-hosted MCP, multi-board routing, browser API/CORS, remote dispatch, system service/tray redesign, headless ownership handoff, provider credential import/copy, executable download/update, and additional tunnel providers.
- Changes to MCP tool registration/count, plugin manifests/bundle, board storage format, project file contents, or direct cloudflared spawning from renderer.
- Inventing scripts/verify.mjs or .github/workflows/pr.yml during research; if shared verification rails are needed, plan them against the actual root scripts and a separate scoped ticket where appropriate.
