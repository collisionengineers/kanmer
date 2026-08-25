# Post-implementation report

## Result

Cloudflare cold startup uses a bounded 60-second readiness deadline; generic and established-tunnel health checks remain at 10 seconds, below the 30-second poll interval.

Shutdown now closes every startup race without changing platform scope. RemoteHost checks its stopped state after local HTTP startup and again after the authenticated local verification, preventing entry into the adapter after close. CloudflaredAdapter separately latches stop across every asynchronous pre-spawn boundary and owns a provisional child immediately after spawn. Remote CLI installs one idempotent SIGINT/SIGTERM path before awaiting startup and releases only its matching owner marker.

No Ubuntu lane or new supported platform is present. The proposed lane, AGENTS entry, POSIX-only test, and fixture were removed after operator rejection. Final CI remains the original Windows workflow.

## Evidence and retained attempts

1. Packaged v0.3.10 failed with `TUNNEL_READINESS_TIMEOUT`; direct trace showed successful HTTP/2 registrations only after the former 10-second startup limit.
2. Initial server build failed because core had not been built in the fresh worktree. Correct build order passed; this failure remains retained.
3. Full `npm run verify` passed before review remediation.
4. `42bb1f9d` separated 60-second startup from 10-second health.
5. `11b65c4f` installed early signal shutdown and provisional-child cleanup.
6. `5a91466e` added the pre-spawn adapter cancellation latch but also temporarily added an unplanned Ubuntu lane.
7. `4e137d4f` removed that workflow/test expansion; Windows focused verification passed 39/39 with zero skips and exact-head hosted Windows checks passed.
8. Independent review then reproduced a higher RemoteHost race during deferred `verifyLocal`. `f0c7c0ce` added stopped-state guards and a regression proving close during deferred verification results in zero provider starts. Final focused Windows verification passed 40/40 with zero skips; MCP typecheck and diff hygiene passed. Hosted checks and fresh independent review are rerunning at this head.

## Final diff and scope

The PR changes only readiness policy/tests, Cloudflare adapter/tests, remote host/tests, and remote CLI. ChatGPT connector wiring and Grok importer compatibility remain separate under [[GUI-141]] and [[GUI-140]]; [[DOC-026]] owns the closeout-plan refresh.
