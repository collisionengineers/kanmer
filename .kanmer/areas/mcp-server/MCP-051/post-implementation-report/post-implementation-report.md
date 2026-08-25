# Post-implementation report

## Result

Changed the single production readiness policy in `packages/mcp-server/src/tunnels/readiness.ts` from 10 seconds to a bounded 60 seconds. The Cloudflare adapter still requires an HTTP 200 from its loopback `/ready` endpoint and still kills/cleans a child that never becomes ready. No authentication, DNS, process ownership, retry, or provider configuration behavior changed.

Added a regression assertion in `readiness.test.mjs` that pins the production allowance to 60,000 ms; existing explicit short-deadline tests continue proving timeout and fail-closed behavior.

## Live diagnosis and evidence

- Packaged v0.3.10 initially reported `TUNNEL_READINESS_TIMEOUT` and left the named tunnel without a connector.
- A direct cloudflared trace preserved the underlying provider timing: connectivity pre-checks reported QUIC/TCP failures, then four HTTP/2 edge connections registered after Kanmer's former 10-second deadline.
- The fixed branch started the canonical remote host against the retained named-credentials tunnel and reached `local: ready`, `provider: running`, with the public endpoint emitted.
- Local bearer-protected MCP initialization returned 200 with a session. The public route rejected missing credentials with 401 and `WWW-Authenticate: Bearer realm="kanmer"` when the single GUI-owned connector was active.
- A temporary second connector with a distinct token demonstrated that multiple independent auth generations on one tunnel are invalid test topology; it was removed, leaving only the GUI-owned connector.

## Verification attempts

1. `npm run build:server` from a fresh worktree failed because `@kanmer/core/dist/index.js` had not yet been built. Focused tests still ran and passed 27/27; the build failure is retained.
2. Correct build order: `npm run build:core`, `npm run build:server`, then the readiness/cloudflared/supervisor tests — PASS, 27/27.
3. `npm run verify` — PASS: build, 310 core tests, 477 GUI tests, HTTP/remote tests, 116 script tests, all typechecks, docs, protocol smokes, skill checks, AGENTS block checks, MCPB and plugin sync.
4. `git diff --check` — PASS.

## Scope

Commit `ab03340b` contains only the readiness policy and its regression test. The separately observed ChatGPT OAuth-form mismatch and Grok importer restriction are not absorbed into this fix and require their own tickets.
