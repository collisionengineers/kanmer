# Post-implementation report

## Result

Cloudflare cold startup now has an explicit bounded 60-second readiness deadline in `cloudflared.ts`, allowing connectivity pre-checks and QUIC-to-HTTP/2 fallback to finish. The generic readiness default and established-tunnel health checks remain explicitly bounded at 10 seconds. Since production polls health every 30 seconds, one failed health probe completes before the next poll and cannot overlap it.

The adapter still requires HTTP 200 from its loopback-only `/ready` endpoint and still kills and cleans a child that never becomes ready. Authentication, DNS, process ownership, retry, and provider configuration behavior are unchanged.

Regression coverage pins both policies, proves the health deadline is below the monitor interval, and records that adapter startup receives 60 seconds while degradation and recovery probes receive 10 seconds.

## Live diagnosis and evidence

- Packaged v0.3.10 reported `TUNNEL_READINESS_TIMEOUT` before Cloudflare completed edge fallback.
- A direct trace preserved the timing: QUIC/TCP pre-check failures were followed by four successful HTTP/2 edge registrations after the former 10-second startup deadline.
- The canonical named-credentials route later reached its authenticated local origin and public bearer challenge; temporary duplicate-token connector state was retired so only the GUI-owned connector remained.

## Verification attempts

1. Initial `npm run build:server` failed in the fresh worktree because `@kanmer/core/dist/index.js` had not been built. This failure remains part of the record.
2. Correct build order (`npm run build:core`, then `npm run build:server`) passed; the original focused suite passed 27/27.
3. Full `npm run verify` passed: builds, 310 core tests, 477 GUI tests, HTTP/remote tests, 116 script tests, all typechecks, docs, protocol smokes, skills, AGENTS, MCPB, and plugin sync.
4. After independent review found the startup deadline had leaked into recurring health, commit `42bb1f9d` separated the policies. Rebuild plus readiness/cloudflared/supervisor/remote-host tests passed 36/36, MCP server typecheck passed, and `git diff --check` passed.
5. Hosted checks on exact head `42bb1f9deeff22ec6e5a9179eccbfeb6a2d54e6e` were rerun; their final status is recorded in the review attestation rather than inferred here.

## Commits and scope

- `ab03340b` introduced the bounded fallback allowance and initial regression.
- `42bb1f9d` corrected the independent-review finding by separating startup and ongoing health deadlines and extending regression coverage.

The final PR changes `readiness.ts`, `readiness.test.mjs`, `cloudflared.ts`, and `cloudflared.test.mjs`. ChatGPT connector wiring and Grok importer compatibility remain separate work under [[GUI-141]] and [[GUI-140]]; [[DOC-026]] owns the closeout-plan refresh.
