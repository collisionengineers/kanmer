# Checklist — GUI-095

## Architecture and API inspection

- [x] Read current project/settings/main/preload/renderer/process/test architecture.
- [x] Read MCP-021/025/026/027 tunnel, HTTP, secret, remote-host, doctor and Cloudflare seams.
- [x] Verify Electron safeStorage, context isolation, clipboard, sender/frame/origin and true-quit lifecycle.
- [x] Define the approved encrypted storage backends and fail closed for plaintext/unavailable storage.
- [x] Confirm packaged runtime requirements for canonical remote and doctor CLIs.

## Implemented GUI path

- [x] Add versioned app-owned remote-access registry under the existing settings.json envelope, keyed by the canonical MCP project fingerprint.
- [x] Persist only Cloudflare executable/tunnel/hostname/credential-file references and enabled state; never persist bearer material.
- [x] Atomically write the registry and normalize/drop unknown or malformed persisted fields.
- [x] Keep encrypted bearer ciphertext in an app-owned secret directory with opaque ids and protected file permissions.
- [x] Generate bearer material in main-process flow, persist before delivery, and fail closed on unsafe safeStorage backends.
- [x] Return a bearer only from the explicit one-time delivery response; mask/copy/dismiss it in the renderer and never include it in status/config/events.
- [x] Add expiring delivery capabilities and clipboard cleanup that clears only an unchanged copied value.
- [x] Add named remote IPC/preload operations only; validate trusted sender/frame/origin, project ids, exact config fields and argument types.
- [x] Keep runtime state in main, expose allowlisted status and redacted doctor DTOs, and support project-scoped status subscriptions.
- [x] Track separate local/tunnel/public dimensions plus config/runtime generations; stale child events are ignored.
- [x] Serialize per-project actions and shared settings writes; reject duplicate hostname/tunnel identities.
- [x] Start the canonical MCP remote-host CLI through a child process; the GUI does not spawn cloudflared or duplicate doctor logic.
- [x] Pass the board root/repository root explicitly so the child reports the same project fingerprint as MCP.
- [x] Implement explicit start/stop, bounded startup/stop cleanup, output framing, stale child handling and true-quit cleanup.
- [x] Add Cloudflare-only project settings UI with safe endpoint copy, guarded token create/rotate, start/stop and doctor actions.
- [x] Confirm before switching away from a project with an active remote runtime.
- [x] Ship packaged CJS remote/doctor CLI resources required by the GUI; keep the existing MCP plugin artifact entry unchanged.
- [x] Add focused identity, registry, manager, safe-storage and clipboard tests.
- [x] Run GUI typecheck, MCP typecheck, GUI build and focused remote-access tests.

## Verification

- [x] Full root test suite: core 256, GUI 328, MCP remote/doctor/HTTP 61, scripts 66; all passed.
- [x] Root typecheck, MCP/GUI builds, and git diff check passed; existing plugin artifact was not modified.

## Deferred (explicitly outside this implementation pass)

Full public doctor evidence against a live Cloudflare route, duplicate headless-owner discovery, automatic-start ordering/semaphore, transactional in-place rotation rollback, renderer-wide Remote Access overview, and dedicated Electron integration/accessibility/Windows canary evidence remain deferred. These require additional provider/process test seams or follow-up GUI work and are not represented as completed behavior here.

The OpenAI provider lifecycle remains out of scope and is linked to [[GUI-104]].
