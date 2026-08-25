# Files

- `packages/mcp-server/src/tunnels/readiness.ts` — increase the bounded default connector readiness allowance so Cloudflare pre-checks and transport fallback can complete.
- `packages/mcp-server/src/tunnels/readiness.test.mjs` — lock the production default and retain timeout/fail-closed behavior.
- `CLOSEOUT_PLAN.md` — update after the fix is merged and released, in its own ticket if required by scope.
