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
- [x] Run GUI tests, root typecheck, build, manual check, and packaged smoke.
- [x] Prove two concurrent project profiles reach only their intended boards with distinct health ports.
- [x] Audit repository files, settings, logs, diagnostics, and proof for credential/tunnel-identifier leakage.
- [x] Summarise exact behavior and residual external prerequisites for the post-implementation report.

## Progress notes


## Verification disposition

- Full GUI vitest: 41 files / 372 tests PASS. Root typecheck, GUI typecheck, GUI build, manual freshness, packaged dist:check/updater package (8/8), and diff-check all PASS on final head 37bb6644.
- Live two-profile verification is PASS: two independently configured profiles passed doctor, ran concurrently on distinct ports, returned HTTP 200 from `/readyz`, and their exact packaged MCP commands resolved different boards. A live ChatGPT app is linked to the production profile; the isolated test profile intentionally has no permanent ChatGPT app.

## F-002 verification note

- Project-close cleanup is wired through the manager and covered by the focused lifecycle test; focused manager + Settings tests: 6/6 PASS.
- GUI typecheck (npm run typecheck -w @kanmer/gui) and git diff --check: exit 0.
- Final-head follow-up also passed root npm run typecheck, npm run dist:check (updater package 8/8), and full GUI vitest 41 files / 372 tests.
