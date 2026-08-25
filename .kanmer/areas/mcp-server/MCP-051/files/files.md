# Files

- `packages/mcp-server/src/tunnels/readiness.ts` — retain the generic bounded 10-second readiness policy used by established-service checks.
- `packages/mcp-server/src/tunnels/readiness.test.mjs` — lock the generic bounded default and retain timeout/fail-closed behavior.
- `packages/mcp-server/src/tunnels/cloudflared.ts` — give cold startup an explicit 60-second allowance, keep health checks at 10 seconds, and expose the provisional owned child for cancellation.
- `packages/mcp-server/src/tunnels/cloudflared.test.mjs` — prove distinct deadlines and cancellation of a child whose startup readiness is pending.
- `packages/mcp-server/src/remote-host.ts` — close the authenticated listener, cancel an adapter startup handle, then join the supervisor lifecycle.
- `packages/mcp-server/src/remote-cli.ts` — install one idempotent SIGINT/SIGTERM shutdown path before awaiting remote startup and release the matching owner marker.
- `packages/mcp-server/src/remote-cli.test.mjs` — subprocess regression for signal-driven cleanup during delayed startup (runs on POSIX where cloudflared is detached).
- `packages/mcp-server/src/tunnels/fixtures/fake-cloudflared-delayed.mjs` — deterministic delayed-start provider used only by the subprocess regression.
- `CLOSEOUT_PLAN.md` — update after merge/release under [[DOC-026]], outside this ticket's implementation diff.
