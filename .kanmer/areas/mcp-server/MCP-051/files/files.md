# Files

- `packages/mcp-server/src/tunnels/readiness.ts` — retain the generic bounded 10-second readiness policy used by established-service checks.
- `packages/mcp-server/src/tunnels/readiness.test.mjs` — lock the generic bounded default and retain timeout/fail-closed behavior.
- `packages/mcp-server/src/tunnels/cloudflared.ts` — give Cloudflare cold startup an explicit 60-second fallback allowance while keeping recurring health checks at an explicit 10 seconds.
- `packages/mcp-server/src/tunnels/cloudflared.test.mjs` — prove startup and recurring health use distinct deadlines and that the health deadline remains below the 30-second monitor interval.
- `CLOSEOUT_PLAN.md` — update after the fix is merged and released under [[DOC-026]], outside this ticket's implementation diff.
