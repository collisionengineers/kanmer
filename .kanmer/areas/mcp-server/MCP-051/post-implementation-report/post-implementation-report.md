# Post-implementation report

## Result

Cloudflare cold startup now has an explicit bounded 60-second readiness deadline, while generic and established-tunnel health checks remain explicitly bounded at 10 seconds. The 10-second health deadline is below the production 30-second polling interval, preventing overlapping probes.

The final revision also makes the extended startup window safe to cancel. The adapter publishes its provisional owned child before awaiting readiness; remote-host closes the authenticated listener, cancels that provisional child, and joins the supervisor lifecycle; remote-cli installs one idempotent SIGINT/SIGTERM path before `remote.start()` and releases only its matching owner marker. The loopback `/ready` HTTP-200 requirement, authentication, DNS, retry policy, and provider configuration remain unchanged.

## Live diagnosis and evidence

- Packaged v0.3.10 failed with `TUNNEL_READINESS_TIMEOUT` before Cloudflare completed edge fallback.
- A direct trace preserved QUIC/TCP pre-check failures followed by four successful HTTP/2 registrations after the former 10-second startup deadline.
- Independent review identified that a longer startup wait first leaked into recurring health, then exposed a pre-existing late signal-handler window. Both findings were fixed rather than accepted as release risk.

## Verification attempts

1. Initial `npm run build:server` failed in the fresh worktree because `@kanmer/core/dist/index.js` had not been built. The failure is retained.
2. Correct build order passed; the original focused suite passed 27/27.
3. Full `npm run verify` passed before review remediation: 310 core tests, 477 GUI tests, HTTP/remote tests, 116 script tests, all typechecks, docs, protocol smokes, skills, AGENTS, MCPB, and plugin sync.
4. Commit `42bb1f9d` separated 60-second startup from 10-second health. The focused suite passed 36/36 and MCP typecheck passed.
5. Commit `11b65c4f` added cancellation/owner cleanup. On Windows, the readiness/cloudflared/supervisor/remote-host/remote-cli suite passed 38 with one intentional POSIX-only subprocess skip; MCP typecheck and `git diff --check` passed. Hosted Linux CI must execute, not skip, the detached-provider signal regression and is authoritative for that path.

## Commits and scope

- `ab03340b` — initial bounded fallback allowance.
- `42bb1f9d` — separate startup and recurring-health deadlines.
- `11b65c4f` — cancel delayed startup on shutdown and prove owner/provider cleanup.

The final PR changes readiness policy/tests, Cloudflare adapter/tests, remote host/CLI lifecycle code, the CLI subprocess test, and one test-only delayed provider fixture. ChatGPT connector wiring and Grok importer compatibility remain separate work under [[GUI-141]] and [[GUI-140]]; [[DOC-026]] owns the closeout-plan refresh.
