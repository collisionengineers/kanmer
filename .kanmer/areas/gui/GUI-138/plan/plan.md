# Plan — GUI-138

## Objective
Make packaged doctor consume truthful manager-owned Cloudflare readiness, including real restart state and attempt.

## Ordered steps
1. Propagate supervisor attempt through RemoteHostStatus and remote-cli.
2. Map restarting to degraded in GUI manager and retain the emitted attempt.
3. Pass an allowlisted snapshot to doctor.
4. Test supervisor → host protocol and manager → doctor boundary.
5. Run focused suites, full typecheck/build/test, review, exact-merge packaged verification.

## Constraints
No secrets/raw logs, no provider queries, no weakened doctor semantics.

## Acceptance
Ready reports connected attempt 1; restart reports degraded with the real later attempt; TUNNEL_PROCESS_READY cannot pass during backoff.
