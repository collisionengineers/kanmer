# Files

- `packages/mcp-server/src/tunnels/readiness.ts` — retain the generic bounded 10-second readiness policy used by established-service checks.
- `packages/mcp-server/src/tunnels/readiness.test.mjs` — lock the generic bounded default and retain timeout/fail-closed behavior.
- `packages/mcp-server/src/tunnels/cloudflared.ts` — give cold startup an explicit 60-second allowance, keep health checks at 10 seconds, latch cancellation across every asynchronous pre-spawn boundary, and expose any spawned provisional child for cleanup.
- `packages/mcp-server/src/tunnels/cloudflared.test.mjs` — prove distinct deadlines, cancellation while readiness is pending, and cancellation during delayed validation before any child can spawn.
- `packages/mcp-server/src/remote-host.ts` — close the authenticated listener, cancel the adapter startup handle, then join the supervisor lifecycle.
- `packages/mcp-server/src/remote-cli.ts` — install one idempotent SIGINT/SIGTERM shutdown path before awaiting remote startup and release the matching owner marker.
- `CLOSEOUT_PLAN.md` — update after merge/release under [[DOC-026]], outside this ticket's implementation diff.
