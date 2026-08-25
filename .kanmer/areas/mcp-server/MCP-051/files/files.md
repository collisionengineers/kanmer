# Files

- `packages/mcp-server/src/tunnels/readiness.ts` — retain the generic bounded 10-second readiness policy.
- `packages/mcp-server/src/tunnels/readiness.test.mjs` — lock the generic default and timeout behavior.
- `packages/mcp-server/src/tunnels/cloudflared.ts` — use explicit 60-second startup/10-second health deadlines, latch pre-spawn cancellation, and expose spawned provisional-child cleanup.
- `packages/mcp-server/src/tunnels/cloudflared.test.mjs` — prove distinct deadlines, pending-readiness cancellation, and delayed-validation cancellation before spawn.
- `packages/mcp-server/src/remote-host.ts` — stop at local-host and post-verification boundaries after close, cancel the adapter, then join supervisor lifecycle.
- `packages/mcp-server/src/remote-host.test.mjs` — prove close during deferred local verification prevents any provider start.
- `packages/mcp-server/src/remote-cli.ts` — install idempotent signal shutdown before remote startup and release the matching owner marker.
- `CLOSEOUT_PLAN.md` — update after merge/release under [[DOC-026]], outside this diff.
