# Checklist — GUI-104

- [ ] Author, approve, and link the governing document for GUI-owned OpenAI tunnel lifecycle; clear docs_todo.
- [ ] Define typed non-secret profile and lifecycle IPC contracts.
- [ ] Persist per-project profile metadata in app-global settings without accepting or storing an API-key value.
- [ ] Validate unique profile names and health addresses and require the named environment credential at launch.
- [ ] Reuse the canonical packaged stdio invocation and normalize Windows paths per DOC-010.
- [ ] Implement init, doctor, start, stop, restart, redacted status, and owned-process cleanup in the main process.
- [ ] Integrate tunnel cleanup/restart-required behavior with project close, app quit, and Kanmer update.
- [ ] Add the separate OpenAI Secure MCP Tunnel Settings surface and external workspace/app guidance.
- [ ] Update docs/manual/connect.md and regenerate the in-app manual.
- [ ] Add unit coverage for validation, command construction, redaction, failures, concurrency, and lifecycle cleanup.
- [ ] Run GUI tests, root typecheck, build, manual check, and packaged smoke.
- [ ] Prove two concurrent project profiles reach only their intended boards with distinct health ports.
- [ ] Audit repository files, settings, logs, diagnostics, and proof for credential/tunnel-identifier leakage.
- [ ] Summarise exact behavior and residual external prerequisites for the post-implementation report.

## Progress notes
