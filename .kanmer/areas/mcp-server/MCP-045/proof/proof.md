---
kind: proof-record
ticket: "MCP-045"
merged_sha: "85ace9d16abac4d578f5d16bfd2c6b27e7742783"
verified_at: "2026-08-23T12:05:39Z"
result: PASS
environment: "Windows 11; detached clean worktree at the exact merged SHA; disposable protected HTTPS tunnel; Infisical-injected runtime credentials"
attempts:
  - attempted_at: "2026-08-23T11:59:00Z"
    command: "npm ci --ignore-scripts --no-audit --no-fund"
    exit_code: 0
    result: PASS
    summary: "Clean lockfile install completed in the detached merged-SHA worktree."
  - attempted_at: "2026-08-23T11:59:30Z"
    command: "node packages/mcp-server/src/integration/remote-public.test.mjs"
    exit_code: 1
    result: FAIL
    summary: "Initial focused test attempt correctly exposed that the detached worktree had no built dist artifact yet; no product assertion failed."
  - attempted_at: "2026-08-23T12:00:30Z"
    command: "npm run build"
    exit_code: 0
    result: PASS
    summary: "Core and MCP server, including the merged standalone/runtime artifacts, built successfully."
  - attempted_at: "2026-08-23T12:00:50Z"
    command: "node packages/mcp-server/src/integration/remote-public.test.mjs"
    exit_code: 0
    result: PASS
    summary: "Focused remote contract suite passed 2/2."
  - attempted_at: "2026-08-23T12:01:10Z"
    command: "npm run plugin:check"
    exit_code: 0
    result: PASS
    summary: "Tool-reference and committed standalone bundle checks passed."
  - attempted_at: "2026-08-23T12:01:25Z"
    command: "npm run typecheck"
    exit_code: 0
    result: PASS
    summary: "All workspace typechecks passed."
  - attempted_at: "2026-08-23T12:01:40Z"
    command: "npm run test:scripts"
    exit_code: 0
    result: PASS
    summary: "Dependency-free script suite passed 94/94."
  - attempted_at: "2026-08-23T12:02:10Z"
    command: "npm run verify"
    exit_code: 1
    result: FAIL
    summary: "Full local rail reached the core suite and hit one Windows timing timeout in the stale-lock recovery test (309/310 passed); the same test passed with the documented 30000ms timeout retry."
  - attempted_at: "2026-08-23T12:02:45Z"
    command: "npx vitest run src/io.test.ts --testTimeout 30000"
    exit_code: 0
    result: PASS
    summary: "Targeted stale-lock recovery retry passed 32/32."
  - attempted_at: "2026-08-23T12:03:05Z"
    command: "gh pr checks 230"
    exit_code: 0
    result: PASS
    summary: "Hosted merged-commit CI passed both verify and kanmer-gate."
  - attempted_at: "2026-08-23T12:04:55Z"
    command: "node scripts/verify-remote-public.mjs --acknowledge-protected-environment --sha 85ace9d16abac4d578f5d16bfd2c6b27e7742783 --descriptor <protected token-file descriptor> --output <sanitized result>"
    exit_code: 0
    result: PASS
    summary: "Canonical protected verifier ran through the disposable HTTPS tunnel against the exact merge; local doctor, public authentication negatives, MCP initialize, project fingerprint, remote policy, dispatch exclusion, wrong-project rejection, bounded mutation, gate refusal, session lifecycle, and cleanup all passed."
  - attempted_at: "2026-08-23T12:05:20Z"
    command: "git rev-parse HEAD; git status --short --branch"
    exit_code: 0
    result: PASS
    summary: "Verification worktree was detached at the exact merge and clean."
---
Merged-main verification PASS for MCP-045. The protected descriptor now accepts only the documented endpoint/token-file/project/mutation fields, the canonical public verifier passed against the exact merge, and hosted CI passed. The two local failures were retained as evidence and resolved by building the required artifact and applying the targeted Windows timing retry; no assertion was weakened or removed.

Closeout traceability: PR [#230](https://github.com/collisionengineers/kanmer/pull/230) merged at 2026-08-23T11:57:33Z with merge commit 85ace9d16abac4d578f5d16bfd2c6b27e7742783. Deployment: n/a (non-deployable verifier tooling).
