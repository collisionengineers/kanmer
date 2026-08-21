# Checklist — GUI-095

## Architecture and API inspection

- [x] Read current project/settings/main/preload/renderer/process/test architecture.
- [x] Read MCP-021/025/026/027 tunnel, HTTP, secret, remote-host, doctor and Cloudflare seams.
- [x] Verify Electron safeStorage, context isolation, clipboard, sender/frame/origin and true-quit lifecycle.
- [x] Define the approved encrypted storage backends and fail closed for plaintext/unavailable storage.
- [x] Confirm packaged runtime requirements for canonical remote and doctor CLIs.

## Implemented GUI path

- [x] Add versioned app-owned remote-access registry keyed by the canonical MCP project fingerprint.
- [x] Persist only Cloudflare executable/tunnel/hostname/credential-file references and enabled state; never persist bearer material.
- [x] Atomically write the registry and normalize/drop unknown or malformed persisted fields.
- [x] Keep encrypted bearer ciphertext in an app-owned secret directory with opaque ids and protected file permissions.
- [x] Generate bearer material in main-process flow, persist before delivery, and fail closed on unsafe safeStorage backends.
- [x] Return a bearer only from the explicit one-time delivery response; mask/copy/dismiss it in the renderer and never include it in status/config/events.
- [x] Add named remote IPC/preload operations only; validate trusted sender/frame/origin, project ids, exact config fields and argument types.
- [x] Keep runtime state in main, expose allowlisted status and redacted doctor DTOs, and support project-scoped status subscriptions.
- [x] Start the canonical MCP remote-host CLI through a child process; the GUI does not spawn cloudflared or duplicate doctor logic.
- [x] Pass the board root/repository root explicitly so the child reports the same project fingerprint as MCP.
- [x] Implement explicit start/stop, bounded startup/stop cleanup, output framing, stale child handling and true-quit cleanup.
- [x] Add Cloudflare-only project settings UI with safe endpoint copy, guarded token create/rotate, start/stop and doctor actions.
- [x] Confirm before switching away from a project with an active remote runtime.
- [x] Ship packaged CJS remote/doctor CLI resources required by the GUI; keep the existing MCP plugin artifact entry unchanged.
- [x] Add focused identity, registry and safe-storage tests.
- [x] Run GUI typecheck, MCP typecheck, GUI build and focused remote-access tests.

## Verification

- [ ] Full GUI/root test suite and packaging/update checks.
- [ ] Final diff-check, worktree residue inspection, and review-stage handoff.

## Deferred (explicitly outside this implementation pass)

The ticket plan contains a larger hardening matrix for queue concurrency, duplicate-owner detection, optimistic config/runtime generations, automatic-start ordering, full public doctor verification, generation-aware rotation rollback, clipboard replacement monitoring, renderer accessibility integration, and end-to-end fake-provider/Windows evidence. Those require additional test seams or a follow-up ticket and are not represented as completed behavior here.

The OpenAI provider lifecycle remains out of scope and is linked to [[GUI-104]].
