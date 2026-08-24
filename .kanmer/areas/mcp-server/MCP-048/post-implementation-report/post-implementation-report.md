# Post-implementation report — MCP-048

## Summary

The Cloudflared loopback readiness helper no longer treats its polling cadence as a per-request deadline. Startup remains loopback-only and finite: the existing 10-second total startup deadline is preserved, each request is capped at one second and by the remaining total window, and a genuine deadline still surfaces `TUNNEL_READINESS_TIMEOUT`.

Independent review finding F-001 correctly identified an unauthorized change of that total deadline to 30 seconds. It is fixed in the rebased PR #239 head `2b9ea369b50a4d8ab32347d40356db655a10f948`, which retains the 10-second default.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/tunnels/readiness.ts` | Kept `DEFAULT_READINESS_TIMEOUT_MS` at 10,000 ms; added named 100 ms polling and one-second request ceilings; separated per-request abort timing from polling cadence and capped request/sleep calculations by remaining total time. | A Cloudflare provider can transiently return 503 or delay local readiness while edge connections register. A valid loopback HTTP response must not be aborted merely because it takes longer than the next probe interval. |
| `packages/mcp-server/src/tunnels/readiness.test.mjs` | Added a real loopback HTTP server case: immediate 503 followed by a 150 ms HTTP 200 with a 10 ms polling cadence. | Proves the policy distinction deterministically. Existing invalid-endpoint and malformed-success timeout assertions remain unchanged. |

## Governing docs

- **Meets `docs/functional/frd/FRD-025-remote-access.md`:** preserves RA-TUNNEL-3's bounded safe process boundary and RA-TUNNEL-5's local-first, loopback health check. The adapter still validates only `http://127.0.0.1`/IPv6-loopback `/ready`, and no public route, bearer handling, provider control-plane setting, or tunnel configuration changes.
- No governing document or ADR was modified.

## Review disposition

- **F-001 (blocker, fixed):** independent review found that the implementation had changed the total deadline from 10 seconds to 30 seconds without plan authority. Commit `2b9ea369b50a4d8ab32347d40356db655a10f948` restores the existing 10-second default. It does not change the one-second per-request cap, polling behaviour, success/timeout assertions, or MCP-028/public-provider scope.
- The source branch was rebased onto `origin/main` `c31544fc98fef186d3f60c1c0df6ee0a177182c9` and force-pushed to PR #239. The rebased implementation commits are `317eb29b` and `2b9ea369`.
- A fresh independent review is required at the new PR head; the implementation author did not review or merge it.

## Risks / follow-ups

- A stalled local HTTP request is bounded to one second and never exceeds the remaining 10-second total deadline. The total startup budget is intentionally unchanged.
- This is a local adapter-policy/test correction. Real public remote-client verification, provider/DNS configuration, and Worker evidence remain MCP-028 scope and are not claimed here.
- The packet named `npm test -w @kanmer/mcp-server`; that command exited 1 before the rebase because the workspace defines no `test` script. The defined MCP rail is `npm run test:http -w @kanmer/mcp-server`, which passed. This environmental command mismatch is recorded, not suppressed.

## Verification hand-off

Run on merged `main`:

- `npm run verify` — expected exit 0. Final pre-merge evidence: a fresh normal checkout cloned from the GitHub origin, then fetched the unpushed local candidate branch, at `2b9ea369b50a4d8ab32347d40356db655a10f948`; `npm ci --ignore-scripts` exited 0 and `npm run verify` exited 0 (core 310/310, GUI 462/462, MCP HTTP 102/102, scripts 98/98; builds, typechecks, docs, smokes, mcpb, and plugin checks passed).
- `node --test packages/mcp-server/src/tunnels/readiness.test.mjs packages/mcp-server/src/tunnels/cloudflared.test.mjs` — isolated ticket-worktree exit 0 with 19 passing tests, including delayed local 200 and retained timeout behaviour.
- Isolated ticket-worktree core/server builds and MCP-server typecheck exited 0; `npm run test:http -w @kanmer/mcp-server` exited 0 with 102 passing tests.
- A pre-rebase normal-clone verify at `19b21a2a` was interrupted after more than 120 seconds idle because GUI-130 concurrently used the fixed Electron test user-data directory; it exited 1 and is **INCONCLUSIVE**, not PASS. It is not used as the final evidence.
- The focused readiness suite was also run five consecutive times on Windows with system Node v24.15.0; each run exited 0 with 8 passing tests.
