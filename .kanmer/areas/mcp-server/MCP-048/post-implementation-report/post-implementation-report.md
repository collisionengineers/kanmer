# Post-implementation report — MCP-048

## Summary

The Cloudflared loopback readiness helper no longer treats its polling cadence as a per-request deadline. Startup remains loopback-only and finite: the default total window is now 30 seconds, each request is capped at one second and by the remaining total window, and a genuine deadline still surfaces `TUNNEL_READINESS_TIMEOUT`. PR #239 carries the change at commit `e03115543edee8fdac2f9f0813a08b1fcff5d6dd`.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/tunnels/readiness.ts` | Added named bounded timing constants; separated the 30-second total startup deadline and one-second per-request ceiling from the 100 ms poll cadence; capped request/sleep calculations by remaining time. | Cloudflare can transiently return 503 or delay local readiness while edge connections register. A valid loopback HTTP response must not be aborted merely because it takes longer than the next probe interval. |
| `packages/mcp-server/src/tunnels/readiness.test.mjs` | Added a real loopback HTTP server test: immediate 503 followed by a 150 ms HTTP 200 with a 10 ms polling cadence. | Proves the policy distinction deterministically. Existing invalid-endpoint and malformed-success timeout assertions remain unchanged. |

## Governing docs

- **Meets `docs/functional/frd/FRD-025-remote-access.md`:** preserves RA-TUNNEL-3's bounded safe process boundary and RA-TUNNEL-5's local-first, loopback health check. The adapter still validates only `http://127.0.0.1`/IPv6-loopback `/ready`, and no public route, bearer handling, provider control-plane setting, or tunnel configuration changes.
- No governing document or ADR was modified.

## Risks / follow-ups

- A non-ready provider may now occupy startup for at most 30 seconds rather than 10; this is intentional and remains bounded. Individual stalled local HTTP requests remain bounded by one second and never exceed the remaining total deadline.
- This is a local adapter-policy/test correction. Real public remote-client verification, provider/DNS configuration, and Worker evidence remain MCP-028 scope and are not claimed here.
- The packet named `npm test -w @kanmer/mcp-server`; that command exits 1 because the workspace has no `test` script. The defined MCP test rail is `npm run test:http -w @kanmer/mcp-server`, which passed. This is recorded, not suppressed.

## Verification hand-off

Run on merged `main`:

- `npm run verify` — expected exit 0; clean normal-clone pre-merge result: exit 0 on `e03115543edee8fdac2f9f0813a08b1fcff5d6dd` (core 310/310, GUI 462/462, MCP HTTP 102/102, scripts 98/98; docs/typechecks/smokes/mcpb/plugin checks passed).
- `node --test packages/mcp-server/src/tunnels/readiness.test.mjs packages/mcp-server/src/tunnels/cloudflared.test.mjs` — expected 19 passing tests, including delayed local 200 and retained timeout behavior.
- The focused readiness suite was also run five consecutive times on Windows with system Node v24.15.0; each run exited 0 with 8 passing tests.
