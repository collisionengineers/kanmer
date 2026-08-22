# Checklist — GUI-104

- [x] Author, approve, and link the governing document for GUI-owned OpenAI tunnel lifecycle; clear docs_todo.
- [x] Define typed non-secret profile and lifecycle IPC contracts.
- [x] Persist per-project profile metadata in app-global settings without accepting or storing an API-key value.
- [x] Validate unique profile names and health addresses and require the named environment credential at launch.
- [x] Reuse the canonical packaged stdio invocation and normalize Windows paths per DOC-010.
- [x] Implement init, doctor, start, stop, restart, redacted status, and owned-process cleanup in the main process.
- [x] Integrate tunnel cleanup/restart-required behavior with project close, app quit, and Kanmer update.
- [x] Add the separate OpenAI Secure MCP Tunnel Settings surface and external workspace/app guidance.
- [x] Update docs/manual/connect.md and regenerate the in-app manual.
- [x] Add unit coverage for validation, command construction, redaction, failures, concurrency, and lifecycle cleanup.
- [ ] Run GUI tests, root typecheck, build, manual check, and packaged smoke.
- [ ] Prove two concurrent project profiles reach only their intended boards with distinct health ports.
- [x] Audit repository files, settings, logs, diagnostics, and proof for credential/tunnel-identifier leakage.
- [x] Summarise exact behavior and residual external prerequisites for the post-implementation report.

## Progress notes


## Verification disposition

- Full GUI typecheck/build and full GUI vitest retain pre-existing dispatch/provider failures; exact commands, exits, and first failures are in the post-implementation report and scratch.
- Two-project OpenAI control-plane and live listener proof is **INCONCLUSIVE** without disposable credentials/projects and a documented listener probe. The GUI validates/records loopback health addresses but does not rewrite tunnel-client profile health configuration or claim live listener readiness.
