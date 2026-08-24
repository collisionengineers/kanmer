# Checklist — MCP-048

- [x] [pre-review] Reproduce focused readiness behavior from a fresh `origin/main` ticket worktree and record the exact exit.
- [x] [pre-review] Decouple the finite per-request readiness budget from polling cadence without exceeding the remaining total deadline.
- [x] [pre-review] Add a deterministic delayed loopback HTTP 200 case after transient non-ready behavior.
- [x] [pre-review] Preserve the invalid-endpoint and genuine-timeout assertions without weakening success criteria.
- [x] [pre-review] Run focused readiness and adapter tests repeatedly; run MCP test/typecheck/build rails and record exact exits.
- [x] [pre-review] Write the implementation report, commit/push, open PR #239 with `Kanmer: MCP-048`, and move only to Review.
- [ ] [post-merge] Verify the merged result on main and write proof; do not perform this as the implementation author.
- [x] [pre-review] Stop at the independent-review boundary; do not merge or start another ticket.

## Progress notes

- 2026-08-24 — Research and plan record the observed Windows/provider timing as a bounded local readiness policy issue. No public endpoint, provider credential, or control-plane operation is in scope.
- 2026-08-24 — Commit `e03115543edee8fdac2f9f0813a08b1fcff5d6dd` was pushed as `mcp-048-loopback-readiness-timing`; PR #239 is open. A clean normal clone verified that exact SHA with `npm run verify` exit 0. The focused readiness suite passed five consecutive Windows runs. The packet's `npm test -w @kanmer/mcp-server` command exits 1 because that workspace defines no `test` script; the repository's supported MCP rail `npm run test:http -w @kanmer/mcp-server` passed 102/102 and the full verify rail passed.
