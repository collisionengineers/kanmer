# Checklist — GUI-095

## Architecture and security

- [x] Read current project/settings/main/preload/renderer/process/test architecture and MCP-021/025/026/027 seams.
- [x] Verify Electron safeStorage, context isolation, clipboard, sender/frame/origin and true-quit lifecycle.
- [x] Define approved encrypted storage backends; accept Electron `gnome_libsecret` and `kwallet*` names and fail closed for plaintext/unavailable storage.
- [x] Confirm packaged runtime requirements for canonical remote and doctor CLIs.

## Implemented GUI path

- [x] Add versioned app-owned remote-access registry under the existing settings.json envelope, keyed by canonical MCP project fingerprint.
- [x] Persist only Cloudflare executable/tunnel/hostname/credential-file references, enabled/auto-start state and safe generations; never persist bearer material.
- [x] Atomically write the registry and normalize/drop unknown or malformed persisted fields.
- [x] Keep encrypted bearer ciphertext in an app-owned secret directory with opaque ids and protected file permissions.
- [x] Persist the new bearer record before rotation activation; retain the old record/config on persistence failure and invalidate old deliveries only after success.
- [x] Return a bearer only from the explicit one-time delivery response; bind delivery consumption to project, webContents and frame.
- [x] Mask delivery by default in the renderer; expire/consume on timeout, unmount, close, rotation or quit; clear only an unchanged copied clipboard value.
- [x] Add named remote IPC/preload operations only; validate exact sender/frame/origin, project ids, exact config fields, versions and argument types.
- [x] Keep runtime state in main and expose allowlisted status/doctor DTOs with health dimensions, severity, repair, safe summaries and config/runtime generations.
- [x] Serialize per-project actions and shared settings writes; reject duplicate hostname/tunnel identities and stale config/runtime mutations.
- [x] Start the canonical MCP remote-host CLI through an allowlisted child environment; the GUI does not spawn cloudflared or duplicate doctor logic.
- [x] Detect duplicate headless ownership through an exclusive canonical owner record; never force-takeover an ambiguous owner.
- [x] Pass board root/repository root explicitly and ignore stale child/doctor events from older generations.
- [x] Implement explicit start/stop, bounded graceful cleanup, exact owned-tree force cleanup, tracked doctor cleanup, output bounds and true-quit cleanup.
- [x] Implement deterministic multi-project auto-start with a global maximum-two semaphore and independent failures.
- [x] Implement explicit remove/reconcile flow with stop-before-remove and recoverable settings transaction ordering.
- [x] Add a registered-project overview while retaining project-scoped detail/status controls.
- [x] Add Cloudflare-only project settings UI with safe endpoint copy, guarded token create/rotate, start/stop, doctor, reconcile and remove actions.
- [x] Ship packaged CJS remote/doctor CLI resources; keep the existing MCP plugin artifact entry unchanged.
- [x] Add focused identity, registry, manager, safe-storage and clipboard tests, including delivery binding, rotation invalidation, concurrent registration and backend names.

## Verification

- [x] Full GUI suite: 37 files, 332 tests passed.
- [x] Focused remote suite: 5 files, 14 tests passed.
- [x] Root typecheck, MCP/GUI builds and `git diff --check` passed.
- [x] Existing standalone MCP plugin artifact bytes were not modified.

## Explicitly deferred

Live public-route evidence against a real Cloudflare route, full Electron integration/accessibility/Windows canary evidence, and any OpenAI provider lifecycle remain outside this implementation pass. The OpenAI provider is tracked by [[GUI-104]]. No checkbox above claims those deferred items.

## Remediation evidence note

The third remediation adds shared settings locking/atomic sync, Windows canonical path normalization, orphan/unsafe-record reconciliation, pre-spawn and cancelled-doctor cleanup, startup missing-path validation, exact dev URL validation, and the renderer project-card/token-dialog integration test. Final follow-up evidence is 37 GUI test files/334 tests, focused remote tests 5 files/18 tests, root typecheck, GUI build, and git diff --check all passing. Deferred public-route, live Electron/Windows canary, and OpenAI-provider evidence remain explicitly deferred prose only.

Correction: final full GUI suite is 37 files/336 tests passed after the Windows canonical-path fixture; focused remote suite is 5 files/18 tests passed. No checklist state changed.

Validator alignment note: Cloudflare tunnel UUID, executable, credentials path, and non-IP DNS hostname validation now matches the canonical MCP adapter boundary; malformed persisted records are dropped and covered by tests.
