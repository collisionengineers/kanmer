# Checklist — MCP-041

- [x] Confirm the recorded 60/61 GitHub symptom and test-timer race from research; preserve it as baseline evidence.
- [x] Replace the bounded-restart test's event-loop-turn guesses with explicit bounded lifecycle synchronization while retaining child-count/state/stop assertions.
- [x] Verify the diff is test-only and production supervisor retry/stop code is unchanged.
- [x] Build `@kanmer/mcp-server` and pass the focused supervisor suite plus repeated focused runs.
- [x] Run the complete `test:http` rail, package typecheck, and shared verification rail where runnable; record the 61/61 package pass and the shared-verify unrelated ETIMEDOUT failure without weakening or hiding it.
- [x] Write/read back the post-implementation report, record commit/PR traceability, push/open the MCP-041 PR, and hand off at Review.

## Progress notes

Baseline on main: focused supervisor 7/7, package `test:http` 61/61, and 100 repeated focused runs passed locally; the recorded GitHub 60/61 failure remains preserved as the triggering evidence.

Implementation evidence: only `packages/mcp-server/src/tunnels/supervisor.test.mjs` changed; supervisor production sources are unchanged. Worktree build passed, focused supervisor suite passed 7/7, and 100 repeated focused runs passed.

Full test:http first post-change run: FAIL (59/61). Unrelated failures preserved: src/http.test.mjs project-resolution child spawnSync ETIMEDOUT; src/tunnels/readiness.test.mjs bounded loopback readiness TUNNEL_READINESS_TIMEOUT. Supervisor tests still passed 7/7 in the same run.

Rerun full test:http: FAIL (60/61), only unrelated src/tunnels/readiness.test.mjs TUNNEL_READINESS_TIMEOUT; prior http ETIMEDOUT did not recur. Isolated readiness suite then passed 7/7. Third full test:http rerun: PASS 61/61. Package typecheck: PASS (tsc --noEmit).

Shared verify evidence: core 263/263 and GUI 352/352 passed; verify then failed in npm test's MCP test:http phase at unrelated http.test.mjs child-process ETIMEDOUT. Package test:http later passed 61/61; isolated readiness passed 7/7.

Review handoff: post-implementation report read back; commit `99d3f259639a50d0319a136816cd088e3df2da2a` recorded; PR #145 opened at https://github.com/collisionengineers/kanmer/pull/145. Stop for independent review; do not merge or clean up.

Stacked dependency verification: `npm run verify` rerun passed core 263/263, GUI 352/352, MCP `test:http` 61/61, scripts 80/80, stdio smoke 224/224, and headless smoke; it failed at `mcpb:check` with missing `@anthropic-ai/mcpb/dist/cli/cli.js` (`MODULE_NOT_FOUND`). Preserved as an environment/dependency failure; no ticket scope absorbed.

## Merged-main verification

Verified after PR #145 merge `8a9eee57e1779f83f30504851e1bff0bf167247a`: build exit 0; focused supervisor 7/7 exit 0; package `npm run test:http -w @kanmer/mcp-server` 61/61 exit 0; package typecheck exit 0; diff-check exit 0. Original 99d3f259 and stacked aac1e252/72da8d076 are reachable from main. Preserved transient hosted attempt 1 npm ci ECONNRESET/EPERM failure (job 96961297681); attempt 2 job 96961421442 passed in 2m17s. No MCPB/provider/remote-host claim made.

# Closeout checklist

## Closeout — MCP-041

- [x] PR merge verified (gh pr view --json state,mergedAt)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; git worktree remove .worktrees/mcp-041
- [ ] git branch -d mcp-041-supervisor-retry (-D if squash/rebase-merged)
- [ ] git fetch --prune + git worktree prune
- [ ] take_ticket action: release
