# Checklist — MCP-048

- [ ] [pre-review] Reproduce focused readiness behavior from a fresh `origin/main` ticket worktree and record the exact exit.
- [ ] [pre-review] Decouple the finite per-request readiness budget from polling cadence without exceeding the remaining total deadline.
- [ ] [pre-review] Add a deterministic delayed loopback HTTP 200 case after transient non-ready behavior.
- [ ] [pre-review] Preserve the invalid-endpoint and genuine-timeout assertions without weakening success criteria.
- [ ] [pre-review] Run focused readiness and adapter tests repeatedly; run MCP test/typecheck/build rails and record exact exits.
- [ ] [pre-review] Write the implementation report, commit/push, open a PR with `Kanmer: MCP-048`, and move only to Review.
- [ ] [post-merge] Verify the merged result on main and write proof; do not perform this as the implementation author.
- [ ] [pre-review] Stop at the independent-review boundary; do not merge or start another ticket.

## Progress notes

- 2026-08-24 — Research and plan record the observed Windows/provider timing as a bounded local readiness policy issue. No public endpoint, provider credential, or control-plane operation is in scope.
