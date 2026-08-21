# Checklist — GUI-095

## Architecture and API inspection

- [ ] Read current project/settings/main/preload/renderer/process/test architecture.
- [ ] Read actual MCP-021/025/026/027 exports/events/errors/reports.
- [ ] Verify pinned Electron safeStorage/IPC/clipboard/security APIs.
- [ ] Define accepted secure storage backends and reject plaintext fallback.
- [ ] Confirm true app quit versus window/tray lifecycle.
- [ ] Update file paths before coding if canonical layout differs.

## Settings and types

- [ ] Define schema-v1 per-project settings keyed by full fingerprint.
- [ ] Include only approved non-secret desired configuration.
- [ ] Reject raw token/verifier/credential contents/arbitrary args/PID/port/session/runtime status/unknown fields.
- [ ] Define separate draft, safe runtime, IPC, error, event, and one-time delivery types.
- [ ] Add config/runtime generations and optimistic version.
- [ ] Extend one canonical settings store.
- [ ] Validate/migrate/quarantine corrupt entries atomically.
- [ ] Enforce hostname/tunnel/secret uniqueness across projects.
- [ ] Reconcile moved path only on exact fingerprint match.
- [ ] Preserve missing project config disabled, not silently deleted.
- [ ] Test round-trip/migration/failure/conflict/move/mismatch/no-secret.

## Secure bearer persistence

- [ ] Use app-owned data outside repos/boards.
- [ ] Check `safeStorage.isEncryptionAvailable()` and selected backend.
- [ ] Block unavailable/unsafe plaintext backend.
- [ ] Generate through MCP-026 in main only.
- [ ] Encrypt raw token and persist ciphertext plus safe metadata atomically.
- [ ] Use opaque secret id, not project path.
- [ ] Restrict ciphertext file permissions where supported.
- [ ] Decrypt only for start/doctor/delivery/rotation.
- [ ] Verify decrypted token fingerprint/format.
- [ ] Fail safely on corrupt/missing/decrypt mismatch; never replace silently.
- [ ] Delete only through confirmed recoverable removal flow.
- [ ] Expose no generic secret API to renderer.
- [ ] Test backend/cipher/corruption/atomic/delete/canary cases.

## One-time token delivery and clipboard

- [ ] Create expiring random delivery id only after successful secure persistence.
- [ ] Return token only to initiating validated frame/project/purpose.
- [ ] Do not expose through get/list/status/events/reload/other window.
- [ ] Consume/clear on modal completion, expiry, frame destruction, replacement, removal, quit.
- [ ] Reject repeated/expired/wrong-frame/project delivery.
- [ ] Mask by default and require explicit reveal/copy.
- [ ] Copy only from valid delivery.
- [ ] Clear after 60 seconds only if clipboard still equals token.
- [ ] Never read/log unrelated clipboard content.
- [ ] Test unchanged/replaced/multiple copy/expiry/reload/quit and canary surfaces.

## IPC/preload security

- [ ] Expose only named remoteAccess operations and unsubscribe.
- [ ] Freeze bridge; expose no raw ipcRenderer/filesystem/process/shell/fetch/secret store.
- [ ] Validate sender/frame/origin on every call.
- [ ] Validate schemas and reject unknown fields.
- [ ] Require full fingerprint for all project calls.
- [ ] Require expected config version and runtime generation where applicable.
- [ ] Return coded safe results only.
- [ ] Send only allowlisted safe status/report/event DTOs.
- [ ] Permit raw token only in explicit one-time response.
- [ ] Test forged sender, malformed args, wrong identity/version/generation, unsubscribe, and redaction.

## Runtime manager

- [ ] Maintain one record/queue per project fingerprint.
- [ ] Track config/runtime/auth/doctor generations and owned handles.
- [ ] Serialize actions per project.
- [ ] Ignore stale child/doctor/renderer events.
- [ ] Make start/stop idempotent.
- [ ] Keep runtime state in main only.
- [ ] Validate project/config/uniqueness/secret/provider/ownership before start.
- [ ] Detect headless/other owner and refuse without killing.
- [ ] Decrypt bearer, verify fingerprint, derive verifier, clear raw value after setup.
- [ ] Deliver verifier through approved protected process mechanism; no raw argv.
- [ ] Spawn canonical remote host, not cloudflared directly.
- [ ] Parse machine-readable events only.
- [ ] Clean every partial/cancel/failure path and force only owned tree.
- [ ] Keep public status unverified until doctor passes.
- [ ] Test every phase/failure/cancel/malformed event/canary/orphan path.

## Multi-project and lifecycle

- [ ] Collect auto-start projects in deterministic order.
- [ ] Validate before queueing.
- [ ] Limit concurrent starts to two.
- [ ] Do not pre-decrypt queued secrets.
- [ ] Isolate project failures and release slots.
- [ ] Reject duplicate active provider identities.
- [ ] Cancel pending starts on quit/disable.
- [ ] Stop exact generation idempotently.
- [ ] Stop tunnel before HTTP and await bounded cleanup.
- [ ] Force only exact owned process tree.
- [ ] Remove config/secret transactionally; never delete provider credential file.
- [ ] Stop every GUI-owned project on true app quit.
- [ ] Do not stop on renderer reload/window close unless app lifecycle says quit.
- [ ] Test many projects/order/cap/failure/conflict/quit/reload/tray/no-orphan.

## Doctor and rotation

- [ ] Invoke canonical MCP-027 from main with protected token provider.
- [ ] Serialize doctor against conflicting project actions.
- [ ] Store/render safe full runtime report and persist safe summary only.
- [ ] Map exact check ids to groups/repairs/manual anchors.
- [ ] Set verified only for current project/config/runtime/auth generation passing public checks.
- [ ] Mark verification stale after relevant generation/config/time change.
- [ ] Confirm rotation consequence explicitly.
- [ ] Persist new ciphertext before activation.
- [ ] Keep old state on persistence failure.
- [ ] Apply canonical in-place rotation or transactional restart.
- [ ] Invalidate old sessions and update auth generation.
- [ ] Update settings metadata atomically.
- [ ] Handle activation/settings failures with accepted rollback/fail-safe stop.
- [ ] Create one-time delivery only after unambiguous success.
- [ ] Delete old encrypted record only after recovery boundary.
- [ ] Test every doctor/rotation/stale/failure/old-new token path.

## Renderer UX

- [ ] Add Remote Access navigation/overview for every registered project.
- [ ] Render independent local/tunnel/public status dimensions.
- [ ] Cover not configured/stopped/starting/connected-unverified/verified/degraded/restarting/failed/stopping/missing project states.
- [ ] Show safe endpoint/last doctor/first repair/context action.
- [ ] Disable duplicate/unsafe actions during operations.
- [ ] Keep project statuses independent.
- [ ] Subscribe/unsubscribe once and merge generation-aware events.
- [ ] Build staged provider/executable/tunnel/bearer/review flow.
- [ ] Use canonical field/check validation and file-dialog path reference only.
- [ ] Show secure backend truthfully.
- [ ] Never auto-generate token.
- [ ] Handle optimistic save conflict and running edit stop/restart.
- [ ] Add confirmations for rotate/material edit/remove/reconcile/quit.
- [ ] Render doctor checks and bounded redacted events, not raw stderr.
- [ ] Remove token from reducer/DOM after modal close.
- [ ] Support keyboard/focus/screen-reader/live status/non-color semantics/responsive paths.
- [ ] Test all component/state/accessibility cases.

## Integration and verification

- [ ] Run full fake configure→generate→start→connected→doctor verified→rotate→stop flow.
- [ ] Run two-project bounded concurrent flow with isolated failure.
- [ ] Run missing/moved/wrong fingerprint/duplicate owner flows.
- [ ] Reload renderer during active runtime with no duplicate child.
- [ ] Quit app with active projects and prove no residue.
- [ ] Prove unsafe storage has no plaintext fallback.
- [ ] Scan settings/metadata/IPC/events/DOM/logs/argv/env/doctor/export/snapshots/clipboard for canary.
- [ ] Confirm context isolation/no Node integration/narrow bridge.
- [ ] Run GUI main/preload/renderer/unit/integration/accessibility checks.
- [ ] Run root tests/typecheck/build/verify and Windows rail.
- [ ] Confirm no MCP tool/count/plugin change.
- [ ] Run `git diff --check`; inspect app-data/process/temp/settings residue.
- [ ] Record backend/schema/IPC/concurrency/lifecycle/doctor/rotation/quit/accessibility/canary evidence.
- [ ] Stop before merge.

## Roadmap amendment — Cloudflare-only GUI path

- [ ] Configure the exact named-tunnel/hostname/credential-reference mode without generated-ingress editing.
- [ ] Show redacted MCP-027 results and preserve bearer/provider-credential separation.
- [ ] Verify OpenAI profile lifecycle is not implemented here and is linked to [[GUI-104]].
