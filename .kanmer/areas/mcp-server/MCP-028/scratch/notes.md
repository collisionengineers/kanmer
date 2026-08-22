# Environment reconnaissance — 2026-08-21

- `npx wrangler@latest --version` completed with exit 0 and reported `4.125.0`. This confirms Wrangler can be invoked transiently without changing the repository.
- `cloudflared` is not installed or discoverable on PATH (`Get-Command cloudflared` returned NOT_FOUND).
- No Cloudflare tunnel/account/bearer credential variables were present in the process environment; only unrelated `AZURE_MCP_COLLECT_TELEMETRY` was visible.
- No public endpoint, disposable Worker, tunnel, bearer, or protected credential was provisioned or claimed. MCP-028's external proof therefore remains pending; local rails must continue excluding the public integration scenario.

Started MCP-028 execution in .worktrees/mcp-028 on branch mcp-028-remote-access-integration at origin/main 3f423378. Read full ticket docs, HZN-007 and EPIC-010 context, and get_doc_gates. Plan/checklist gates are present; real Cloudflare credentials/tunnel/cloudflared availability will be classified honestly and never fabricated.

Implementation update: deterministic remote-public harness added under packages/mcp-server/src/integration. It uses the official StreamableHTTPClientTransport/Client against a loopback-only fake public boundary, verifies missing/wrong bearer rejection, initialize, expected project, mutation, gate refusal, session close, cleanup, and central remote dispatch exclusion. `REMOTE_HTTP_EXCLUDED_TOOLS` now excludes dispatch_task/list_dispatches/cancel_dispatch, and the existing HTTP parity test asserts the approved remote policy difference.

Read-only tool probes from the MCP-028 worktree: `wrangler: unavailable`; `cloudflared: unavailable`; checkout SHA at probe time `3f4233789363a36631ee0f8e2f60e33fa84e2619`. No Cloudflare credentials, named tunnel, DNS/TLS route, Worker deployment, or live remote proof was available; these acceptance checks remain INCONCLUSIVE.

Focused evidence: `npm run build -w @kanmer/mcp-server` PASS after building the workspace core; `node --test packages/mcp-server/src/integration/remote-public.test.mjs packages/mcp-server/src/http.test.mjs` PASS 7/7. Full `test:http` first exposed the pre-change HTTP parity expectation and one existing readiness timeout under the concurrent rail; the policy assertion was corrected and the focused rerun passed. Full HTTP rail is being rerun.
