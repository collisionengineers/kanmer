# Research — MCP-048: bounded Cloudflare readiness polling on Windows

## Question

Does the loopback readiness helper incorrectly use its polling cadence as its per-request deadline, creating a false `TUNNEL_READINESS_TIMEOUT` when the provider becomes ready after a short delayed response?

## Findings

- `packages/mcp-server/src/tunnels/readiness.ts` defaults the total readiness deadline to 10 seconds and polling cadence to 100 ms. It aborts every individual loopback fetch after `min(pollMs, 1_000)`, so the default request budget is only 100 ms.
- `waitForTunnelReadiness` is called by `CloudflaredAdapter.start` after the owned child emits `spawn`; it is the adapter's startup readiness evidence and later health checks reuse the same function. The endpoint is constrained to loopback HTTP `/ready`.
- The prior controlled real-provider diagnosis recorded transient 503/timeout results before Cloudflare registered HTTP/2 edge connections, followed by local `/ready` HTTP 200. It preserves no provider credential, hostname, account, or tunnel identifier.
- Existing unit coverage checks immediate 503 then immediate 200, malformed 200 timeout, and unsafe endpoint rejection. It does not prove that a valid delayed loopback 200 is accepted within the overall deadline while a timeout remains a failure.
- FRD-025 RA-TUNNEL-5 requires local-first startup and a bounded health check; RA-TUNNEL-3/RA-OBS-1 require safe, bounded process/diagnostic behavior. It does not require a 100 ms per-request deadline.

## Implications

The polling cadence and per-request budget are distinct controls. The helper should retain a finite total deadline and a finite request deadline bounded by remaining total time, while permitting a normal local HTTP response longer than one polling interval. Tests must retain the negative timeout assertion and add a real loopback delayed-response case; no Cloudflare control-plane or public endpoint is needed.

## Open questions

- None. The policy is internal, preserves the existing endpoint validation and error code, and has a bounded testable contract.
