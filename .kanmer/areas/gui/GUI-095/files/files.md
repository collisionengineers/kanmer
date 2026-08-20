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
