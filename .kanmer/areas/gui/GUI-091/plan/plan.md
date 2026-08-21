# GUI-091 implementation plan

## Governing docs

No ticket-linked PRD, FRD, or ADR applies. This is a spike-profile verification/tooling improvement with no product contract change. [[GUI-068]] remains governed by its own FRD-021 reference; this plan deliberately does not amend updater behaviour or its native-dialog requirement.

## Chosen approach

Add a main-process, opt-in smoke capture route controlled by `KANMER_SMOKE_CAPTURE_PATH`, layered on the existing `KANMER_SMOKE` boot lifecycle. After the renderer has loaded and reached `ready-to-show`, it will set a unique DOM marker through the real `webContents`, read it back, capture via `webContents.capturePage()`, and persist the `NativeImage` PNG to the caller-provided path. Any invalid path, marker mismatch, empty image, or write failure exits non-zero.

This beats CDP/GDI because it uses Electron's documented main-process compositor API. It avoids a renderer/IPC feature because the sole purpose is controlled proof capture; normal builds and launches do nothing. It deliberately does not promise native title-bar or OS-dialog capture, which lies outside `webContents`.

## Ordered work

1. Inspect main startup/import conventions and identify a small testable helper for validating the opt-in capture path and writing PNG output.
2. Add the smoke-only capture orchestration in `createWindow()`: wait for both the renderer/load readiness that smoke already verifies, create a unique current marker in the live DOM, verify it, call `capturePage()`, reject empty output, write the PNG, and preserve single deterministic smoke exit handling.
3. Add focused tests for the helper and smoke capture success/failure boundaries without requiring a live Electron window.
4. Document the exact invocation using a fresh `--user-data-dir`, a disposable PNG path, the expected success/failure behavior, and its renderer-only boundary.
5. Run GUI typecheck and focused tests; then run the real Electron smoke command with an explicit capture path. Inspect the resulting image and record dimensions plus marker evidence in the report.
6. Complete report, traceability, PR review, merged-main proof, and closeout through the full Kanmer lifecycle.

## Verification and proof

- Automated: focused capture helper tests plus GUI typecheck.
- Live: start the actual built Electron app in smoke mode with `KANMER_SMOKE_CAPTURE_PATH` to an empty temporary PNG and a fresh user-data directory. It must exit 0 and create a non-empty PNG. Inspect the image with vision; a visible, unique marker establishes that the captured renderer was current.
- Boundaries: verify normal smoke mode still exits cleanly without capture and no normal launch writes screenshots.
- Proof on merged `main` will include commands, exit codes, image dimensions/path, the visual review outcome, and the explicit limitation that OS-owned dialogs/chrome are not captured.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Capture races the first renderer paint. | Chain after existing load/ready conditions and verify the marker before capturing. |
| A path environment variable writes unexpectedly. | Require it only in smoke mode, validate it is an explicit file path, and use a disposable caller-owned path in tests. |
| A misleading image appears non-empty but stale. | Generate and read back a fresh marker immediately before the capture, then visually inspect the resulting PNG. |
| Scope expands into updater/native-dialog behaviour. | Keep all updater code unchanged and state the renderer-only boundary in docs, report, and proof. |
