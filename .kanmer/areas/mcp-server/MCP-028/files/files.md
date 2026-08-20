# Files — MCP-028

## Add

Use the repository's existing integration-test directory and module format if it differs from the proposed paths below. Update this `files.md` before implementation rather than creating a second integration harness.

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/integration/remote-public-types.ts` | Schema-v1 public-integration input, stable check ids, explicit status/severity, sanitized evidence/result, environment classification, cleanup result, secret-scan result, and JSON-safe serialization types. No field may accept raw bearer/provider credential/session/document content. |
| `packages/mcp-server/src/integration/remote-public.ts` | Canonical integration orchestrator: validate protected inputs and exact commit, create disposable project/fixture, run local regressions, start authenticated remote host/tunnel, invoke public doctor and separate client, execute project/tool/gate/session/rotation/degradation tests, aggregate evidence, run idempotent cleanup, scan canaries, and emit one sanitized result. It must call canonical MCP-021/025/026/027 modules rather than duplicate them. |
| `packages/mcp-server/src/integration/remote-public-client.mjs` | Separate-process official MCP SDK client used against the public HTTPS endpoint. It performs negative raw-HTTP probes where required, valid initialize/discovery/orientation/read/write/session-close operations, and emits a bounded sanitized child result. It accepts protected bearer delivery through an inherited descriptor/IPC or approved secret-file reference, never an argv token. |
| `packages/mcp-server/src/integration/remote-public-fixture.ts` | Disposable format-3 Kanmer project/board factory with deterministic statuses/profile/config, one readable ticket, one versioned document mutation target, one gate-blocked ticket/action, expected-project mismatch fixture, initial hashes, and guaranteed teardown. Never clone/use the production board. |
| `packages/mcp-server/src/integration/remote-public-evidence.ts` | Stable check registry/order, safe evidence builders, endpoint masking/fingerprinting, command/result normalization, Markdown proof renderer, JUnit/result adapters only if the repository already uses them, and central canary scan over every retained surface. Human proof must derive from the JSON result. |
| `packages/mcp-server/src/integration/remote-public-cleanup.ts` | Idempotent cleanup stack: clients/sessions, tunnel, HTTP host, owned process tree, restart timers, metrics sockets, runtime configs, generated client config, token file/buffers, disposable board/worktrees, clipboard fixture, open ports/process verification, and provider-resource policy callback. Cleanup failure changes overall result to fail. |
| `packages/mcp-server/src/integration/remote-public.test.ts` | Deterministic local/fake-provider tests for orchestration order, stable ids, preflight refusal, mutation/gate assertions, rotation/restart/degradation, environment/product/harness failure classification, bounded retry, proof rendering, canary detection, cleanup idempotency/failure, and no production paths. It must not contact the public network. |
| `scripts/verify-remote-public.mjs` | Canonical operator command: parse only protected configuration references, require explicit integration acknowledgement/environment, acquire one concurrency lock, invoke built integration harness, write sanitized JSON/Markdown to an explicit output directory, preserve exits, and never run from normal `npm run verify` or PR triggers. |
| `packages/mcp-server/src/integration/fixtures/fake-public-environment.mjs` | Test-only local TLS/provider/client fixture for harness tests when predecessor fake infrastructure is insufficient. Prefer reusing MCP-021/027 fixtures; do not duplicate cloudflared/MCP protocol behavior unnecessarily. |

## Add only when the repository/environment supports protected manual Actions

| Path | Purpose |
|---|---|
| `.github/workflows/remote-integration.yml` | Manual `workflow_dispatch` only, protected GitHub Environment, no `pull_request`/fork/push trigger, least permissions, one concurrency group, explicit commit/ref input, protected secret/file materialization, canonical script invocation, sanitized artifact upload, unconditional cleanup, and artifact secret scan. Add only after repository owners confirm an environment/runner can hold the required tunnel/provider resources; the local script remains canonical. |

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/package.json` | Export/build the integration harness and separate client, add a clearly named manual script/bin only if package conventions require it, and keep stdio/HTTP/tunnel/doctor defaults unchanged. No public integration command may run through ordinary test/install lifecycle scripts. |
| `package.json` | Add `verify:remote-public` (or canonical equivalent) pointing to `scripts/verify-remote-public.mjs`; explicitly exclude it from `test`, `verify`, plugin check, release preflight, and PR CI. Add a local fake-harness test to ordinary tests through existing discovery. |
| `scripts/verify.mjs` | Inspect only to assert/document that real public integration is not implicitly invoked. Modify only if a guard/check is needed to prevent accidental inclusion. |
| `packages/mcp-server/src/remote-host.ts` | Expose narrow owned-process/status/generation/control hooks required by the integration harness; no test-only public bypass and no secret serialization. |
| `packages/mcp-server/src/doctor/index.ts` and `doctor/types.ts` | Reuse/export public report/check types and permit the harness to consume the exact sanitized report. Modify only for a clean library boundary, not an integration-only result fork. |
| `packages/mcp-server/src/http-auth.ts` | Reuse canonical generation/rotation/revocation hooks. Modify only if the accepted public harness cannot exercise them without a safe existing local control interface. Do not add a remote rotation tool. |
| `packages/mcp-server/src/tunnels/types.ts` | Reuse normalized status/generation/failure classification and owned-child control. Modify only for a generic test/control hook that GUI/doctor also legitimately need. |
| `packages/mcp-server/src/smoke-protocol.mjs` | No public behavior change. Inspect/run as baseline; modify only if a reusable safe official-client helper is extracted without weakening stdio tests. |
| `packages/mcp-server/src/smoke-doctor.mjs` | Reuse doctor result parsing/safe assertions; do not make the local smoke depend on a public provider. |
| `docs/manual/remote-access.md` | After a passing implementation proof, add/link the exact manual invocation/evidence limitations only if DOC-013 has not already consumed them. No secrets/raw logs. |
| `docs/manual/remote-access-troubleshooting.md` | Link integration failure classifications/check ids to existing doctor repairs only if needed; do not create a second troubleshooting taxonomy. |
| `docs/functional/frd/FRD-025-remote-access.md` | Add final verification traceability/reference only if canonical FRD practice permits it; do not alter requirements. Use the actual accepted path. |
| `.gitignore` | Ignore only a repository-local default integration output directory if the canonical script cannot require an external path. Prefer OS temp/explicit output outside the source tree. Never ignore secret files broadly. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/mcp-server/src/http.ts` | Official loopback HTTP lifecycle, limits, one-project readiness, and session controls. |
| `packages/mcp-server/src/http-secret.ts` / `remote-token-cli.mjs` | Protected bearer generation/loading; no duplicate secret parser or raw argv. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` and supervisor | Exact named-tunnel start/readiness/restart/stop behavior and failure codes. |
| `packages/mcp-server/src/doctor/checks.ts` | Exact public check registry and required-pass semantics. |
| `packages/mcp-server/src/server.ts` | Canonical `remote-http-v1` tool exposure set and dispatch exclusions. |
| `packages/mcp-server/src/errors.ts` | Exact expected-project/version/gate errors for negative public assertions. |
| `packages/core/src/store.ts`, `types.ts`, gate/document helpers | Build the disposable board through public/core fixture APIs without touching a live board. |
| `apps/gui/src/main/remoteAccess/manager.ts` and tests | Link actual multi-project/rotation/quit evidence; the public harness must not reimplement the GUI. |
| `apps/gui/src/main/remoteAccess/secrets.ts` | Optional GUI-managed rotation path in a controlled Electron integration; otherwise use headless canonical rotation. |
| `scripts/verify.mjs`, `.github/workflows/pr.yml`, release scripts | Prove public integration is manual/protected and not a PR/release secret dependency. |
| `docs/manual/providers/cloudflared.md` | Environment provisioning prerequisites and supported named-tunnel mode; do not automate account/DNS resources here. |
| accepted FRD/ADR and MCP-021/025/026/027/GUI-095 post-implementation reports | Freeze exact APIs, versions, known limitations, and evidence expectations before writing the harness. |

## Stable integration check ids

The harness should define a stable ordered list at least covering:

- `EXACT_COMMIT_VERIFIED`
- `ROOT_VERIFY_PASS`
- `STDIO_REGRESSION_PASS`
- `LOCAL_DOCTOR_PASS`
- `PUBLIC_DNS_TLS_ROUTE_PASS`
- `PUBLIC_AUTH_NEGATIVE_PASS`
- `PUBLIC_MCP_INITIALIZE_PASS`
- `EXPECTED_PROJECT_PASS`
- `REMOTE_TOOL_POLICY_PASS`
- `REMOTE_DISPATCH_EXCLUDED`
- `WRONG_EXPECTED_PROJECT_BLOCKED`
- `CONTROLLED_REMOTE_MUTATION_PASS`
- `REMOTE_GATE_BLOCK_PASS`
- `PUBLIC_SESSION_LIFECYCLE_PASS`
- `TOKEN_ROTATION_PASS`
- `PROCESS_RESTART_SESSION_INVALIDATION_PASS`
- `TUNNEL_DEGRADATION_RECOVERY_PASS`
- `GUI_MULTI_PROJECT_EVIDENCE_PASS`
- `PUBLIC_DOCTOR_FINAL_PASS`
- `SECRET_SCAN_PASS`
- `CLEANUP_PASS`

Exact ids may be expanded only before implementation review; preserve order and do not infer severity from text.

## Protected invocation inputs

- exact full commit SHA/build artifact identity;
- disposable project output root;
- configured public hostname or safe config reference;
- Cloudflare named-tunnel id/mode;
- protected provider credential-file/secret reference;
- cloudflared executable reference;
- protected ephemeral bearer output/reference;
- optional separate-client runner/SSH/remote host configuration through approved environment, never arbitrary shell text;
- explicit output directory;
- cleanup/provider-resource ownership policy;
- bounded timeout/retry configuration.

No raw bearer/provider credential may be accepted as a command argument, checked into config, or written to proof.

## Do not modify

- Normal PR/root verification to require a real public provider.
- Production boards, endpoints, credentials, DNS/tunnel/account resources, or unrelated cloudflared processes.
- Add Quick Tunnel, OAuth, insecure TLS, remote dispatch, multi-board routing, arbitrary URL scanning, provider resource creation/deletion by default, or a load benchmark.
- Duplicate MCP transport/auth/tunnel/doctor/tool/gate implementations.
- Upload raw stdout/stderr/environment/config/doctor/provider logs as artifacts.
- Allow cleanup failure to pass.
- Hand-edit generated plugin bytes or merge the integration PR.
