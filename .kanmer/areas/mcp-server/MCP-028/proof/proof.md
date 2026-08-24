---
result: PASS
verified_at: 2026-08-22T05:42:00Z
verified_on: 710bddff6d9e1672e8fea38467f3e10848265aad
pr: "154"
---

## Outcome

MCP-028 is verified on merged main commit 710bddff. The provider-neutral remote-access contract is green through the deterministic loopback fixture and hosted CI. The real protected Cloudflare Tunnel/Worker route remains explicitly INCONCLUSIVE because this environment has no cloudflared executable, tunnel endpoint, DNS/TLS ownership, or bearer secret; no live capability is claimed.

## Rails

- Exact merge proof: `git show --no-patch 710bddff` in detached verifier worktree `.worktrees/verify-mcp-028-710bdd`.
- Hosted GitHub verification: PR #154, run 32554249103, job 96985834506 — PASS.
- Detached merged-main `npm test` with a temporary verifier-local `@kanmer/core` junction: manual check PASS; core 13 files / 269 tests PASS; GUI 39 files / 362 tests PASS; MCP HTTP/doctor/remote/tunnel rail 63 tests PASS; scripts 83 tests PASS.
- Detached merged-main `npm run typecheck` with the same temporary package resolution: PASS for core, mcp-server, ui, and gui.
- Detached `npm run build:server`: PASS, including standalone CJS bundle.
- Deterministic remote integration: `remote-public.test.mjs` 2/2 PASS; doctor matrix 9/9 PASS when run from the package workspace. It proves official Streamable HTTP initialize, authentication-negative probes, expected project fingerprint, canonical remote tool policy with dispatch excluded, wrong-project rejection, document version/readback, item update/readback, gate refusal, archive/readback, activity evidence, doctor result, session close, and fixture teardown/idempotence.
- `mcpb:check` in the detached worktree first reported the known byte-path mismatch in the committed plugin bundle (relative esbuild module labels differ by checkout depth); after `plugin:build`, the generated MCPB validated and `check-mcpb-sync` passed. The generated copy was temporary and not presented as a source commit; hosted verification is the authoritative artifact rail.

## Evidence boundaries

- Cloudflare Tunnel/provider startup, public DNS/TLS/no-redirect, disposable Worker deployment and deletion, protected bearer rotation/restart, degradation recovery, and GUI multi-project remote evidence: INCONCLUSIVE (no protected external credentials or endpoint available).
- The isolated fixture root was removed by its idempotent close path; no fixture token, credential, or canary is retained in proof.

## Failed attempts retained

- Before the verifier-local dependency junction, the normal detached worktree resolved `@kanmer/core` through the main-checkout junction; GUI/typecheck/server-build failures named missing dispatch exports and the GUI suite had 264/265. These were setup-resolution failures, not source failures. Re-running with the worktree-local core resolution passed all rails above.
- The first detached `mcpb:check` stopped at the missing worktree-local `@anthropic-ai/mcpb`; linking the installed dependency allowed the validator to run and exposed only the expected relative-path byte mismatch. Regenerating the temporary plugin copy made the check pass.

## Review disposition

Independent review at 45449d0f was PASS after fixing F-001 through F-004. The reviewed remediation is in merge commit 710bddff. No external Cloudflare evidence was inferred from local fixtures.

## Protected public evidence — 2026-08-23

The canonical protected verifier was run from a detached clean worktree at merged SHA 85ace9d16abac4d578f5d16bfd2c6b27e7742783 with a protected token-file descriptor, a disposable named Cloudflare tunnel, and the exact merged HTTP host. The verifier exited 0 with overall outcome pass. Safe boundary results: local doctor 26/26, missing/wrong bearer rejection, official SDK public initialize, expected-project match, exact remote tool policy, dispatch exclusion, wrong-project rejection, bounded mutation/readback, gate refusal, session close, and fixture cleanup all passed. The official SDK client ran as a separate process; same-runner origin/client limitation is retained. Cloudflare DNS/tunnel resources, host, connector, token file, descriptor, and logs were removed after the run. No raw bearer, provider credential, canary content, endpoint, account data, or tunnel identifier is retained.

The Worker-client, token-rotation, host-restart/session-invalidation, bounded-concurrency, tunnel-degradation/recovery, and GUI two-project boundaries remain INCONCLUSIVE and are not promoted to PASS.


## Protected Worker/tunnel attempt with Infisical — 2026-08-23

- Infisical injected the approved Cloudflare account/token references without exposing values. The Cloudflare API accepted disposable tunnel creation.
- First configuration attempt was rejected safely with Cloudflare validation `1056` because the ingress service included the `/mcp` path; no resource was retained.
- A corrected ingress using the loopback origin (with the request path preserved) was applied to fresh disposable tunnel/DNS resources. A temporary `cloudflared` 2026.8.2 connector started, but public 401 readiness did not arrive within the bounded 120-second window; retrying with HTTP/2 produced the same bounded timeout.
- Because public readiness never passed, the Worker was not deployed and no Worker client result is claimed.
- Cleanup ran in `finally`; independent post-run checks found zero `kanmer-mcp028-*` tunnels and zero matching DNS records. Temporary executable, credentials/config files, fixture root, and logs were removed.

This is an environment/provider-readiness INCONCLUSIVE result. It does not weaken the canonical protected verifier PASS above, and it does not promote Worker, token-rotation, restart/invalidation, bounded-concurrency, degradation/recovery, or GUI two-project boundaries to PASS.


## 2026-08-24 public Worker acceptance increment — INCONCLUSIVE overall

### Exact source and provider preparation

- Exact PR #154 merge worktree `710bddff6d9e1672e8fea38467f3e10848265aad`: `npm ci --ignore-scripts` exit 0 and `npm run build` exit 0. Its generated ingress validation failed with `TUNNEL_INGRESS_VALIDATION_FAILED` because the origin service incorrectly contained `/mcp`; no public request was attempted from that artifact.
- The reachable MCP-047 merge `f5401043e7dfdcbb25b7f4a91d87914e96c8254f` corrected the origin-only ingress rendering. In its detached worktree, `npm ci --ignore-scripts` exit 0; a premature server-only build exit 1 was retained (the core workspace had not yet been built); the canonical `npm run build` then exited 0.
- A dedicated locally managed named-tunnel credential reference and public DNS route were operator-provisioned outside repository data. `cloudflared` 2026.8.2 ingress validation and exact `/mcp` rule selection both exited 0. No provider token, tunnel id, hostname, account id, credential content, or bearer is recorded here.

### Real public route and Worker client

- The first provider connections were delayed; an owned HTTP/2 test connector ultimately reached all edge connections and local readiness returned HTTP 200. A public unauthenticated `POST /mcp` returned HTTP 401 with no redirect.
- A disposable Cloudflare Worker was deployed as the external client. Its bearer existed only in a Worker secret binding. The Worker passed public initialize, expected-project comparison, remote tool discovery, disposable create/update/archive, activity observation, and session close.
- The Worker was deleted after the run; the provider API confirmed it absent (HTTP 404). Only the test-owned connector and HTTP host were stopped. Test runtime/token/board/config directories were moved to the local recycle bin; the intended local named tunnel/DNS route and the unrelated pre-existing token-managed connector were retained.

### Boundary and disposition

This proves the external Worker path, public TLS route, bearer rejection, and disposable lifecycle. It does **not** promote the ticket: the canonical automatic adapter timed out before this network's delayed edge readiness, so the successful route used an explicitly owned manual HTTP/2 connector for this increment. Token rotation, host-restart/session invalidation, bounded concurrency, degradation/recovery through the canonical supervisor, complete public doctor matrix, GUI evidence, and full secret/canary scan remain unproven. Overall result remains **INCONCLUSIVE**.
