# Post-implementation report

## Scope delivered

MCP-028 now has a deterministic, provider-neutral remote-public integration harness. The harness uses the official MCP TypeScript SDK Streamable HTTP client against a loopback-only disposable fixture that has the same authenticated `/mcp` boundary as the remote host. It records a schema-versioned, allowlisted evidence packet and uses a LIFO cleanup stack. A separate operator-only verifier accepts only a full commit reference and protected descriptor reference; it never accepts bearer material, does not run in normal CI, and returns INCONCLUSIVE when the protected Cloudflare environment is unavailable.

The central remote exposure policy now excludes `dispatch_task`, `list_dispatches`, and `cancel_dispatch`, and the existing HTTP/stdio parity test asserts that approved difference. No tunnel provider, DNS, TLS, Worker deployment, credential provisioning, Access policy, or board-routing behavior was added.

## Files

- `packages/mcp-server/src/integration/remote-public-types.ts` — schema-v1 check IDs, statuses, sanitized evidence and reason helpers.
- `packages/mcp-server/src/integration/remote-public.ts` — provider-neutral boundary evaluation and protected-run INCONCLUSIVE helper.
- `packages/mcp-server/src/integration/remote-public-client.mjs` — separate official SDK client with protected descriptor mode; no raw secret output.
- `packages/mcp-server/src/integration/remote-public-fixture.ts` — disposable loopback HTTP fixture using the existing bearer host.
- `packages/mcp-server/src/integration/remote-public-cleanup.ts` — bounded reverse-order cleanup.
- `packages/mcp-server/src/integration/remote-public-evidence.ts` — deterministic check construction and serialization.
- `packages/mcp-server/src/integration/remote-public.test.mjs` — client, auth, project, mutation/gate, policy and descriptor tests.
- `scripts/verify-remote-public.mjs` — manual protected-environment entry point; not part of `verify` or ordinary CI.
- `packages/mcp-server/src/index.ts`, `src/http.test.mjs`, `tsup.config.ts`, `package.json` — central policy, parity rail, build entries and focused test registration.

## Governing documents

- `docs/functional/frd/FRD-025-remote-access.md`
- `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`

## Local evidence

- `npm run build:core` — PASS.
- `npm run build -w @kanmer/mcp-server` — PASS (ESM and standalone CJS bundles).
- `npm run typecheck --workspaces --if-present` — PASS for core, mcp-server, ui, and gui.
- `node --test packages/mcp-server/src/integration/remote-public.test.mjs packages/mcp-server/src/http.test.mjs` — PASS, 7/7.
- `node --test packages/mcp-server/src/http.test.mjs packages/mcp-server/src/tunnels/readiness.test.mjs` — PASS, 12/12.
- `git diff --check` — PASS.

The complete `npm run test:http -w @kanmer/mcp-server` rail was attempted. One concurrent run reported two existing timing-sensitive failures (`spawnSync ... ETIMEDOUT` in the project-resolution child probe and `TUNNEL_READINESS_TIMEOUT`); rerunning those affected suites in isolation passed 12/12. The deterministic MCP-028 and HTTP policy tests pass in the focused rail. This timing-sensitive full-rail result remains recorded rather than erased.

## Protected environment disposition

Read-only probes from this worktree returned exactly: `wrangler: unavailable` and `cloudflared: unavailable`. No Cloudflare account, named tunnel, protected bearer reference, DNS/TLS route, or disposable Worker environment was available. Therefore `PUBLIC_DNS_TLS_ROUTE_PASS`, live tunnel lifecycle, token rotation across a hosted route, restart invalidation through the hosted route, GUI multi-project evidence, final public doctor, and external cleanup are INCONCLUSIVE. The manual verifier will return exit code 2 for that environment state; no live claim is made.

## Security and cleanup notes

The client descriptor contains only endpoint/project/reference metadata; the bearer is loaded from a protected file at runtime. Inline credential-shaped descriptor keys and secret-bearing CLI arguments are rejected. Evidence uses allowlisted fields and bounded reasons. The fixture closes the SDK session, HTTP listener, and temporary board root even on test failure. The protected verifier never creates a tunnel or cloud resource.

## Final clean rail addendum

After the timing-sensitive first full HTTP attempt, the final `npm test` exited 0: manual freshness PASS; core 269/269; GUI 362/362; mcp-server HTTP/remote/doctor/tunnel rail 63/63; scripts 83/83. This includes the MCP-028 deterministic client/evidence tests. The earlier 61/63 timing failure is retained in scratch as an attempted failure, not silently replaced.

## Review remediation addendum

The deterministic harness now invokes the existing doctor engine through injected fixture seams and returns a sanitized public-doctor status/count/exit code. It performs the bounded remote lifecycle `create_item → set_ticket_doc(research) → get_ticket_doc version/content predicate → update_item title → get_item → gate-blocked move → update_item archived → get_item → get_activity`. Only fixture ids, versions/predicates, archived state, and activity count are returned; the canary content is never emitted. SDK close errors become explicit cleanup errors, and the test calls fixture close twice and asserts the temporary root is gone.

The planned helper modules are wired: deterministicChecks drives client checks and inconclusiveProtectedChecks drives protected evidence. Protected Cloudflare/Worker proof remains INCONCLUSIVE because Wrangler/cloudflared/credentials/named tunnel are unavailable.

Post-remediation focused evidence: build PASS; official HTTP + MCP-028 integration tests PASS 7/7; workspace typecheck PASS. One concurrent full HTTP attempt had the known child probe `spawnSync ... ETIMEDOUT`; the focused rerun passed and this timing-sensitive failure remains in scratch.

## Hosted verification addendum

Fresh hosted verification for head `45449d0f4935b8cc1193eeaf7cc4b5227f468f08` passed: run `32554249103`, job `96985834506`, duration 2m16s. The hosted verify covers the authoritative build/test/mcpb rails; it does not constitute live Cloudflare proof. Wrangler/cloudflared/credentials remain unavailable locally, so the protected route/Worker checks remain INCONCLUSIVE.
