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
MCP-020 merged as PR #137 at 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5. The shared supervisor/provider registry, three controlled MCP tools, and fail-closed dispatch policy are proven by deterministic tests, builds and protocol/smoke rails. Dispatch remains disabled by default, and live authenticated provider acceptance is explicitly INCONCLUSIVE. The deterministic merged-main feature gate passes. Live authorized provider dispatch/start/observe/cancel remains INCONCLUSIVE because no disposable authenticated host/credential was available; no provider success is claimed. The CI path assertion failure and initial typecheck failure remain retained rather than weakened. This accepted external-evidence risk does not invalidate the disabled-by-default feature gate.

## Merged-main verification rerun — 2026-08-22

- Verified on main af61144ce743f74b2aba92fb0778588b0b9bedd0; merged PR #137 SHA 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5 is an ancestor.
- npm test -w @kanmer/core -- --testTimeout=30000 — PASS, 263/263.
- npm test -w @kanmer/gui — PASS, 352/352.
- npm run typecheck — PASS.
- npm run build — PASS (core and MCP server/standalone).
- node packages/mcp-server/src/smoke.mjs — PASS, 224/224.
- npm run smoke:protocol — PASS, 46/46.
- npm run smoke:discovery — PASS, 13/13.
- npm run check:manual — PASS, manual up to date (22 chapters).
- npm run verify:skills — PASS; npm run plugin:check — PASS (34 tools, synchronized bundle); git diff --check — PASS.
- Live authenticated provider success remains INCONCLUSIVE; the default-disabled start/list/cancel refusal path is proven without claiming a provider run.
