---
kind: proof-record
merged_sha: "1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5"
environment: "merged main / Windows / Node v24.15.0"
verified_at: "2026-08-21T22:35:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-21T21:58:00.000Z"
    command: "initial npm run typecheck"
    cwd: ".worktrees/mcp-020"
    exit_code: 1
    result: FAIL
    summary: "Initial implementation exposed a requestedBy/provider-union type mismatch; retained as the first failing attempt."
  - attempted_at: "2026-08-21T22:00:00.000Z"
    command: "npm run typecheck"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "All core, MCP server, UI and GUI workspaces typechecked after the compatibility fix."
  - attempted_at: "2026-08-21T22:01:00.000Z"
    command: "npm test -w @kanmer/core -- --testTimeout=30000"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "263/263 core tests passed, including dispatch supervisor coverage."
  - attempted_at: "2026-08-21T22:02:00.000Z"
    command: "npm test -w @kanmer/gui"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "352/352 GUI tests passed, including shared provider and dispatch coverage."
  - attempted_at: "2026-08-21T22:03:00.000Z"
    command: "node --test packages/mcp-server/src/dispatch-policy.test.mjs"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "3/3 dispatch policy tests passed."
  - attempted_at: "2026-08-21T22:04:00.000Z"
    command: "npm run build -w @kanmer/core; npm run build -w @kanmer/mcp-server; npm run build -w @kanmer/gui"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "Core, MCP server/standalone and GUI builds passed."
  - attempted_at: "2026-08-21T22:05:00.000Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "Stdio smoke passed 224/224 with 34 tools; dispatch refusal is disabled-by-default."
  - attempted_at: "2026-08-21T22:06:00.000Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/mcp-020"
    exit_code: 0
    result: PASS
    summary: "Protocol smoke passed 46/46 across supported protocol versions."
  - attempted_at: "2026-08-21T22:30:57.000Z"
    command: "GitHub PR verify check run 32533172407"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "The pre-existing GUI kanmerGit.test.ts Windows path expectation failed (`RUNNER~1` vs `runneradmin`); 351/352 GUI tests passed. Finding MCP-020-F2 accepted as out-of-scope CI/environment risk."
  - attempted_at: "2026-08-21T22:35:00.000Z"
    command: "live authorized provider dispatch/start/observe/cancel"
    cwd: "."
    exit_code: null
    result: INCONCLUSIVE
    summary: "No disposable authenticated provider host was authorized or available; no live provider success is claimed."
---
MCP-020 merged as PR #137 at 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5. The shared supervisor/provider registry, three controlled MCP tools, and fail-closed dispatch policy are proven by deterministic tests, builds and protocol/smoke rails. Dispatch remains disabled by default, and live authenticated provider acceptance is explicitly INCONCLUSIVE. The ticket remains Verifying pending that external acceptance; the CI path assertion failure is retained rather than weakened.
