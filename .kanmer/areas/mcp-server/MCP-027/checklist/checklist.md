# Checklist — MCP-027

## Report contract

- [ ] Read accepted FRD/ADR and predecessor APIs/reports.
- [ ] Define `config|local|public` modes.
- [ ] Define `pass|warn|fail|skipped` and explicit severity.
- [ ] Define schema-v1 safe report/check/repair types.
- [ ] Register all 26 exact ids in stable order.
- [ ] Define mode applicability and acyclic prerequisites.
- [ ] Define deterministic aggregation and exits 0/1/2.
- [ ] Ensure result types cannot carry secrets/body/document/full session data.
- [ ] Test uniqueness/order/dependencies/modes/aggregation/exits.

## Execution engine and dependencies

- [ ] Wrap canonical project/config/secret/tunnel/DNS/TLS/HTTP/MCP/clock/log dependencies.
- [ ] Duplicate no predecessor schema or validator.
- [ ] Register cleanup for every secret/client/socket/process handle.
- [ ] Bound each check and total run with cancellation.
- [ ] Run checks in stable order.
- [ ] Emit explicit skipped entries for failed prerequisites.
- [ ] Continue independent checks after ordinary failure.
- [ ] Capture safe expected/observed/duration/repair data.
- [ ] Clean up on pass/fail/cancel/exception.
- [ ] Test multi-failure, skip, warning, timeout, cancellation, throw, and cleanup.

## Configuration checks

- [ ] Implement `PROJECT_CONFIG_VALID` through canonical root/fingerprint logic.
- [ ] Implement `REMOTE_CONFIG_VALID` through canonical remote validator.
- [ ] Implement `SECRET_REFERENCE_VALID` without retrieving/reporting raw token.
- [ ] Implement `TUNNEL_EXECUTABLE_VALID` without starting provider.
- [ ] Implement `TUNNEL_CONFIG_VALID` without resource mutation.
- [ ] Map canonical codes to safe layer/repair references.
- [ ] Prove config mode performs no network/child/board operation.

## Local status and bearer probes

- [ ] Read current local remote-host status through trusted local interface.
- [ ] Require healthy listener, expected project, auth required, and current generation.
- [ ] Verify observed bind is loopback, not configured value only.
- [ ] Do not auto-start a stopped host.
- [ ] Send one missing-auth raw HTTP probe and require exact generic 401/challenge.
- [ ] Generate an independent same-shape wrong token.
- [ ] Send one wrong-auth probe and require identical outcome.
- [ ] Prove negative probes create/refresh no session.
- [ ] Bound requests and redact all values.

## Protected valid credential and local MCP

- [ ] Retrieve raw bearer only through MCP-026 protected provider at point of use.
- [ ] Keep it scoped and register cleanup/zeroization best-effort.
- [ ] Fail/skip dependents safely if retrieval fails.
- [ ] Read no Cloudflare credential content.
- [ ] Use official Streamable HTTP client locally.
- [ ] Complete `AUTH_VALID_ACCEPTED` and `MCP_INITIALIZE_LOCAL`.
- [ ] Call one canonical read-only orientation/status tool.
- [ ] Compare full expected project fingerprint.
- [ ] Compare exact exported remote tool policy and dispatch exclusion.
- [ ] Close client/session and assert no leak.
- [ ] Test healthy/wrong-project/tool-drift/protocol/timeout/server-close/session-leak cases.

## Tunnel and public network

- [ ] Require matching MCP-021 provider/config/origin/project/auth generation.
- [ ] Require provider readiness, not PID.
- [ ] Report every starting/degraded/restart/exhausted/failed state safely.
- [ ] Do not start/stop provider.
- [ ] Use configured HTTPS hostname only.
- [ ] Reject arbitrary URL/path/user-info/query/fragment drift.
- [ ] Resolve DNS with timeout and safe metadata.
- [ ] Validate TLS with platform trust/hostname and no insecure pass.
- [ ] Report safe protocol/issuer/expiry metadata.
- [ ] Do not follow redirects; fail login/HTML/intermediary response.
- [ ] Bound DNS/TCP/TLS/HTTP resources and close sockets.
- [ ] Test trusted/untrusted/wrong-host/expiry/redirect/login/timeout/oversize fixtures.

## Public MCP and consistency

- [ ] Run missing-auth public check.
- [ ] Use official client with valid bearer and standard TLS.
- [ ] Initialize public MCP.
- [ ] Call the same read-only orientation tool.
- [ ] Compare full project fingerprint.
- [ ] Compare exact remote tool policy.
- [ ] Close public diagnostic session.
- [ ] Compare local/public project/protocol/policy/auth generation safely.
- [ ] Leave real provider proof to MCP-028.

## Redaction, no mutation, repairs

- [ ] Seed canaries for token/provider credential/session/path/document phrase.
- [ ] Scan JSON/human/stderr/errors/dependencies/status/cleanup surfaces.
- [ ] Represent redaction proof honestly in production versus instrumented tests.
- [ ] Snapshot/hash disposable board before/after.
- [ ] Ensure fixed check/tool registry references no mutator.
- [ ] Fail any attempted mutating probe registration.
- [ ] Define stable provider-neutral repair catalog plus cloudflared-specific entries.
- [ ] Render human output from JSON report only.
- [ ] Show counts, first blocking layer, later independent failures, and next repair.
- [ ] Keep JSON stdout prose/ANSI-free.

## CLI, smoke, and verification

- [ ] Implement explicit mode and `--json`.
- [ ] Accept canonical config/project refs only.
- [ ] Reject raw token, arbitrary URL, insecure, auto-fix, and provider-mutation flags.
- [ ] Handle signals with cleanup.
- [ ] Emit exact exits 0/1/2.
- [ ] Test argv/exits/cancel/stdout/stderr/path spaces/canary.
- [ ] Run built config and local smoke on disposable board/token/fake tunnel.
- [ ] Run broken fixture and assert exact failed/skipped ids/exit 1.
- [ ] Run invalid invocation and assert exit 2.
- [ ] Export stable types for GUI-095/MCP-028.
- [ ] Confirm no MCP tool/count/reference/plugin change.
- [ ] Run doctor tests, integration, smoke, transport/auth/tunnel regressions.
- [ ] Run `npm test`, typecheck, build, root verify, Windows rail.
- [ ] Run `git diff --check`; inspect processes/sockets/temp/board residue.
- [ ] Record reports, TLS fixtures, canary/no-mutation/cleanup evidence and public handoff.
- [ ] Stop before real public acceptance or merge.

## Roadmap amendment — Cloudflare doctor boundary

- [ ] Classify executable/version, ingress-invalid, ingress-host-mismatch, tunnel-unready, local-origin, bearer and board/project failures separately.
- [ ] Keep all provider config, bearer and diagnostic output redacted; do not introduce Access/service-token support.

## Execution reconciliation — 2026-08-21

Implemented and verified in this ticket:

- [x] Modes, statuses, explicit severities, schema-v1 safe report, exact 26-id ordered registry, mode applicability, acyclic prerequisites, aggregation, and exits 0/1/2.
- [x] Safe details sanitize bearer/secret/password/credential/session/body/document keys; repair catalog and grouped human renderer are derived from the JSON report.
- [x] Stable-order engine emits prerequisite skips, continues independent checks, bounds each check, handles thrown dependencies and cancellation, and closes registered client/cleanup callbacks.
- [x] Canonical MCP-021 tunnel executable/config/status seams are reused; no provider start/stop/resource mutation occurs in doctor.
- [x] Injected local status, loopback binding, negative bearer probes, protected token/MCP client, fingerprint/tool-policy/session-close, tunnel readiness, DNS, TLS, and no-mutation seams are exported for GUI-095/MCP-028 without duplicate transport/auth schemas.
- [x] CLI exposes only config|local|public and --json, rejects raw token/arbitrary URL/insecure/auto-fix/provider-mutation/unknown flags, handles signals, and keeps JSON stdout clean.
- [x] Built doctor smoke and the HTTP/auth/tunnel regression rail pass; no MCP tool count/reference/plugin bytes changed.

Downstream by design (not claimed complete here): real loopback disposable-board/TLS fixture matrix and controlled named-tunnel public acceptance belong to GUI-095/MCP-028. Their interfaces are dependency-injected and the exact check ids/report contract are frozen for that handoff.

## Review remediation checklist — 2026-08-21

- [x] Independent public success path uses a separate protected MCP session, accepts route-level 401 reachability, and compares local/public snapshots after session close.
- [x] Safety checks default to structural redaction/no-mutation passes; top-level result fields are allowlisted and canary tests cover injected details.
- [x] Per-check abort, late-client cleanup, total deadline, and surfaced cleanup failures are implemented and tested.
- [x] Canonical project resolver, protected secret-reference validator, official MCP orientation, and canonical remote tool-policy callbacks are wired for the CLI/library boundary.
- [x] Duplicate CLI source removed; one packaged CLI entry remains.

## Final review remediation — 2026-08-21

- [x] Packaged CLI wires local/public status, bearer probes, tunnel readiness, DNS, TLS, route, protected token, official MCP orientation, and canonical remote tool policy; `KANMER_LOCAL_ENDPOINT` is passed as the local endpoint.
- [x] DNS resolution owns a cancellable `Resolver` handle; HTTP, TLS, MCP, and per-check operations receive the shared abort signal.
- [x] Required unavailable checks fail aggregation rather than yielding a successful warning-only report; not-applicable/prerequisite skips remain explicit informational skips.
- [x] Injected monotonic clock is used for total deadlines and report durations; a fake-clock regression test proves a valid run does not immediately time out.
- [x] CLI MCP setup closes the client on every orientation/list failure; cleanup errors affect status/exit and are shown by the human renderer.

Final verification on commit `0719a399`:

- [x] `npm run build` — PASS.
- [x] `npm run typecheck` — PASS for core, MCP server, UI, and GUI.
- [x] `npm test` — PASS: core 256, GUI 318, MCP/HTTP/doctor 59, scripts 66.
- [x] Built doctor CLI public invocation without configured dependencies fails with exit 1 and explicit failed checks; it does not report a warning-only success.
- [x] `smoke:http` — PASS; `smoke:protocol` — 42/42; `smoke:discovery` — 13/13; `git diff --check` — PASS.

- [x] Final cleanup hardening makes per-session close idempotent, registers each client in the run cleanup stack, and prevents duplicate close calls after successful session closure (commit `91a0a64b`).

- [x] Packaged HTTP probes cancel response bodies after header-only inspection, keeping diagnostic sockets bounded (commit `0552e6f7`).

- [x] Cancellation and total-timeout reports are non-healthy (status fail with exit 2) and regression assertions cover both paths.
- [x] CLI local status validates an exact loopback HTTP `/mcp` endpoint before any request; unsafe endpoint references fail closed without probing (commit `2d54db9e`).
