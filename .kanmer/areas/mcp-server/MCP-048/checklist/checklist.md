# Checklist — MCP-048

- [x] [pre-review] Reproduce focused readiness behaviour from a fresh `origin/main` ticket worktree and record the exact exit.
- [x] [pre-review] Decouple the finite per-request readiness budget from polling cadence without exceeding the remaining total deadline.
- [x] [pre-review] Add a deterministic delayed loopback HTTP 200 case after transient non-ready behaviour.
- [x] [pre-review] Preserve the invalid-endpoint and genuine-timeout assertions without weakening success criteria.
- [x] [pre-review] Run focused readiness and adapter tests repeatedly; run MCP test/typecheck/build rails and record exact exits.
- [x] [pre-review] Write the implementation report, commit/push, and open PR #239 with `Kanmer: MCP-048`.
- [x] [pre-review] Fix independent-review blocker F-001 by restoring the existing 10,000 ms default total deadline only; retain the one-second request cap, polling policy, assertions, and provider/public scope.
- [x] [pre-review] Rebase the corrected branch on `origin/main` `c31544fc`, force-push PR #239 at `2b9ea369`, and run a fresh normal-clone full verification.
- [x] [pre-review] Return only to Review and await a fresh independent review; do not merge or start another ticket.
- [x] [post-merge] Verify the merged result on main and write proof; do not perform this as the implementation author.

## Progress notes

- 2026-08-24 — Research and plan record the observed Windows/provider timing as a bounded local readiness policy issue. No public endpoint, provider credential, or control-plane operation is in scope.
- 2026-08-24 — Initial implementation commit `e03115543edee8fdac2f9f0813a08b1fcff5d6dd` opened PR #239. F-001 correctly found its 30-second default deadline unauthorized by the approved plan.
- 2026-08-24 — Rebased commits `317eb29b` and `2b9ea369` restore the 10-second default. In the isolated ticket worktree: core/server builds and MCP typecheck exited 0, focused readiness + Cloudflared tests passed 19/19, and MCP HTTP tests passed 102/102.
- 2026-08-24 — Final authoritative evidence: a fresh GitHub-origin normal clone at `2b9ea369b50a4d8ab32347d40356db655a10f948` ran `npm ci --ignore-scripts` exit 0 then `npm run verify` exit 0 (core 310/310, GUI 462/462, MCP 102/102, scripts 98/98; docs/typechecks/smokes/mcpb/plugin checks passed). A pre-rebase clone run was interrupted after 120 seconds idle due to concurrent GUI-130 Electron-user-data contention and is recorded as INCONCLUSIVE, not PASS.
- 2026-08-24 — The packet's `npm test -w @kanmer/mcp-server` command exits 1 because that workspace defines no `test` script; the repository's supported MCP rail `npm run test:http -w @kanmer/mcp-server` passed 102/102. This mismatch is recorded, not suppressed.

---

## Closeout — MCP-048

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/mcp-048`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
