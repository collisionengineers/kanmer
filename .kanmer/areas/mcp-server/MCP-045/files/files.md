# Files — MCP-045

## Where the change lands

The ticket modifies only the verifier/client contract and its focused tests.

| Path | Why |
|---|---|
| `packages/mcp-server/src/integration/remote-public-client.mjs` | Allow only safe descriptor references, pass the optional loopback endpoint into the doctor fixture, and emit an explicit top-level outcome for the CLI. |
| `packages/mcp-server/src/integration/remote-public.test.mjs` | Prove safe token-file descriptors, separate local/public endpoints, outcome derivation, and continued rejection of inline credentials. |
| `scripts/verify-remote-public.mjs` | Preserve explicit PASS, FAIL, and INCONCLUSIVE results from the protected client instead of collapsing failures into inconclusive evidence. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/integration/remote-public-evidence.ts` | The canonical boundary ids and pass/fail semantics; every required check must remain visible. |
| `packages/mcp-server/src/doctor/index.ts` | `LOCAL_BIND_LOOPBACK` is an intentional safety gate, so a public URL must never be used as the local endpoint. |
| `packages/mcp-server/src/http-secret.ts` | Token material is loaded from a protected file reference; values must not enter descriptors, argv, logs, or evidence. |
| `docs/functional/frd/FRD-025-remote-access.md` | Remote access is loopback-first, bearer-protected, project-bound, provider-neutral, and doctor-gated. |
| `packages/mcp-server/src/integration/remote-public-fixture.ts` | The deterministic fixture endpoint is loopback and explains why tests must distinguish local and public endpoints. |

## Ripple effects

The standalone MCP build must be regenerated for the verifier/client source change. Focused node tests and the canonical protected verifier must be rerun against the disposable named tunnel. MCP-028 evidence should record the exact merged commit and sanitized outcome.

## Out of scope

This ticket does not change the HTTP transport, bearer implementation, Cloudflare adapter, GUI, descriptor secret storage, board semantics, or the protected tunnel resources. It does not accept inline credentials, add OAuth, or weaken any doctor assertion.
