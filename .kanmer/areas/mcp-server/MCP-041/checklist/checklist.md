# Checklist — MCP-041

- [x] Confirm the recorded 60/61 GitHub symptom and test-timer race from research; preserve it as baseline evidence.
- [x] Replace the bounded-restart test's event-loop-turn guesses with explicit bounded lifecycle synchronization while retaining child-count/state/stop assertions.
- [x] Verify the diff is test-only and production supervisor retry/stop code is unchanged.
- [x] Build `@kanmer/mcp-server` and pass the focused supervisor suite plus repeated focused runs.
- [ ] Pass the complete `test:http` rail, package typecheck, and shared verification rail where runnable; preserve any unrelated failures.
- [ ] Write/read back the post-implementation report, record commit/PR traceability, push/open the MCP-041 PR, and hand off at Review.

## Progress notes

Baseline on main: focused supervisor 7/7, package `test:http` 61/61, and 100 repeated focused runs passed locally; the recorded GitHub 60/61 failure remains preserved as the triggering evidence.

Implementation evidence: only `packages/mcp-server/src/tunnels/supervisor.test.mjs` changed; supervisor production sources are unchanged. Worktree build passed, focused supervisor suite passed 7/7, and 100 repeated focused runs passed.
