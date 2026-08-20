# Research — GUI-095 secret storage, IPC, and process ownership

## Electron trust boundary

The renderer is not a trusted secret/process environment. Electron main owns:

- operating-system-backed bearer persistence;
- provider credential references;
- project/remote settings validation;
- child-process creation/control;
- protected token/verifier delivery;
- doctor execution;
- redacted runtime status/events;
- application-quit cleanup.

The preload exposes a narrow typed API through the repository's existing context-isolated bridge. Never expose raw `ipcRenderer`, filesystem/process primitives, arbitrary command execution, generic URL fetch, or a general secret-store interface to the renderer. Validate sender/frame and every argument in main.

## Bearer persistence

Prefer Electron's official `safeStorage` API because it avoids a new native secret dependency and uses the operating system's available encryption backend. Implementation must inspect the exact Electron version and official API before coding:

- require `safeStorage.isEncryptionAvailable()` before persistent generation/import;
- record/check `safeStorage.getSelectedStorageBackend()` where available;
- reject or explicitly block persistent remote access when the backend is an unsafe plaintext fallback such as `basic_text`;
- encrypt the raw bearer in main and persist only ciphertext plus non-secret id/fingerprint/timestamps in app-owned data outside repositories/boards;
- decrypt only for explicit start/doctor/one-time display/rotation work and keep the value in the smallest scope;
- never send ciphertext as though it were a token or expose the storage key/backend internals.

Use one app-owned secret record per project remote configuration, keyed by opaque secret id rather than project path. Ordinary settings contain the secret id/reference, token fingerprint, created/rotated time, and backend status—not raw token or decryptable plaintext.

If `safeStorage` is unavailable or reports an unsafe backend, fail closed for persistent/auto-start operation. An explicitly documented protected headless token-file flow remains outside GUI storage; do not silently fall back to plaintext JSON.

## Provider credentials

For locally managed cloudflared v1, persist only the selected credentials-file path/reference and safe metadata. Do not import/copy/parse/store its credential contents in GUI settings. Main calls MCP-021 validation before save/start and redacts the path according to diagnostics policy.

If a future provider mode requires a token, store it through the same secure secret abstraction under a distinct type/id. Do not overload the Kanmer bearer record or pass provider credentials to the HTTP host.

## Secret file layout

Use the existing app settings/data root. Recommended separation:

- ordinary remote settings: schema-versioned JSON, no secrets;
- encrypted bearer records: app-owned file/database containing `safeStorage` ciphertext and safe metadata;
- provider credentials: external protected file reference only;
- runtime config: temporary and owned/cleaned by MCP-021.

Writes must be atomic: write temporary file, flush/close, replace, and preserve/repair last known valid data according to existing settings conventions. Restrict file permissions where the platform supports it, even though ciphertext is already encrypted. Corrupt/undecryptable records produce a coded blocker; never generate a replacement silently because clients would lose access unexpectedly.

## IPC surface

Expose project-scoped operations with request ids/generation/version checks, conceptually:

- `remoteAccess.list()`
- `remoteAccess.get(projectFingerprint)`
- `remoteAccess.validateDraft(projectFingerprint, draft)`
- `remoteAccess.save(projectFingerprint, draft, expectedVersion)`
- `remoteAccess.generateBearer(projectFingerprint)`
- `remoteAccess.completeBearerDelivery(projectFingerprint, deliveryId)`
- `remoteAccess.rotateBearer(projectFingerprint)`
- `remoteAccess.start(projectFingerprint, expectedConfigVersion)`
- `remoteAccess.stop(projectFingerprint, generation)`
- `remoteAccess.runDoctor(projectFingerprint, mode)`
- `remoteAccess.getStatus(projectFingerprint)`
- `remoteAccess.subscribe(listener)`
- `remoteAccess.remove(projectFingerprint, expectedVersion)`

A one-time token delivery response contains a short-lived delivery id and raw token only for the explicit generation/rotation modal. Main marks delivery consumed/expired; reload/routine get cannot retrieve it. The renderer must not persist it in state stores, URLs, telemetry, localStorage, snapshots, or logs.

Every mutating IPC call requires:

- current registered project and full fingerprint match;
- schema validation and unknown-field rejection;
- expected configuration version for optimistic concurrency;
- allowed state transition/generation;
- sender/frame validation;
- coded redacted result.

## Main-process manager

Maintain one runtime record per project fingerprint:

- desired config/version;
- current generation and action lock;
- local HTTP/tunnel child ownership/status;
- auth generation/fingerprint;
- doctor status/report summary;
- bounded redacted events;
- abort/cleanup handles.

Use a per-project operation queue/mutex and global bounded auto-start semaphore. Start/stop/rotate/config-save transitions are idempotent and generation-aware. Stale child events and renderer requests cannot mutate a newer generation.

Before start:

1. resolve project and compare fingerprint;
2. read/validate config and uniqueness across projects;
3. decrypt/derive bearer verifier through MCP-026;
4. validate cloudflared/provider references through MCP-021;
5. spawn the canonical remote-host process/library with protected local process delivery;
6. parse machine-readable events and update runtime status.

The raw bearer must not appear in argv. Preferred child delivery is inherited IPC/anonymous pipe. Passing only the non-authenticating verifier digest through a controlled child environment is an acceptable fallback defined by MCP-026, still redacted. The doctor, which must send the raw bearer, should run in the trusted main process/library or receive it through an inherited protected channel—not argv.

## Process ownership and shutdown

- Track exact owned child/process-tree identity and generation.
- Detect an already running headless/GUI owner for the same project/tunnel and refuse duplicate ownership; do not kill it or force takeover.
- On start cancellation/failure, clean any partially started tunnel/HTTP child and runtime config.
- On stop, use canonical remote-host graceful stop, await bounded cleanup, then force only the owned process tree.
- On application quit, stop all GUI-owned projects with a global deadline and report forced cleanup locally.
- Renderer close/reload does not own or kill children.
- On app restart, persisted desired state is not assumed running; inspect ownership/readiness and either reattach only through an authenticated supported protocol or clean/start anew. Do not trust stale PID alone.

No background OS service is created. If the application truly exits, GUI-owned remote access ends. Existing tray/background-app behavior may keep it running, but the remote manager follows the main application lifecycle, not a window lifecycle.

## Clipboard handling

The public endpoint may be copied normally. A bearer copy is sensitive:

- only from the explicit one-time delivery modal;
- main or a narrowly scoped preload call writes the token;
- schedule clear after a documented interval (recommended 60 seconds);
- before clearing, read the clipboard and clear only if it still exactly equals the copied token;
- cancel/replace previous timer safely;
- never read/log unrelated clipboard contents;
- closing the modal removes token from renderer memory/DOM and invalidates the delivery id.

Clipboard clearing is defence in depth, not a guarantee; the UI states that clipboard history/sync may retain data.

## Redaction and diagnostics

Use allowlisted event/status objects. Never forward arbitrary child stderr/errors/config objects over IPC. Canary tests inspect:

- ordinary settings/encrypted-record metadata;
- IPC requests/responses/events;
- renderer state/DOM after modal close;
- console/main/renderer logs;
- doctor report and exported diagnostics;
- process argv/environment;
- crash/unhandled rejection serialization;
- screenshots/snapshots/test artifacts;
- clipboard after expiry when unchanged and after user replacement.

The one explicit reveal response/modal is the sole expected canary surface and must be excluded from persistence/snapshot logging.

## Security and accessibility tests

- context isolation and no Node integration remain enabled;
- preload exposes only named methods and unsubscribable event listeners;
- forged renderer sender/frame/invalid project/version/action is rejected;
- secret backend unavailable/basic-text/corrupt ciphertext/decrypt failure all block safely;
- two project configs cannot reuse hostname/tunnel id/secret id;
- renderer reload rehydrates status without duplicate start;
- stale events/requests are ignored;
- app quit leaves no owned child;
- token reveal/copy/rotate modal is keyboard/screen-reader usable and clearly identifies consequences.

## Non-goals

- No generic password manager UI, token recovery service, plaintext fallback, system service, renderer process spawning, arbitrary shell/URL IPC, or hidden continuation after app exit.
