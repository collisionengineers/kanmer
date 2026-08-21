---
kind: proof-record
merged_sha: "5c08f1a3"
environment: "normal main checkout / Node v24.15.0"
verified_at: "2026-08-21T21:02:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-21T20:58:00.000Z"
    command: "npm test -w @kanmer/mcp-server -- --run"
    cwd: ".worktrees/mcp-024"
    exit_code: 1
    result: NOT_APPLICABLE
    summary: "Workspace has no test script; authoritative smoke command used instead."
  - attempted_at: "2026-08-21T20:59:00.000Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/mcp-024"
    exit_code: 0
    result: PASS
    summary: "195/195 MCP smoke checks passed."
  - attempted_at: "2026-08-21T21:01:00.000Z"
    command: "npm run plugin:build; npm run plugin:check; node packages/mcp-server/src/smoke.mjs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Normal-main plugin parity check passed; merged-main smoke 195/195 passed."
---

Independent merged-main proof: PR #134 merged at 5c08f1a3. The change adds SHA-bound advisory record schemas and executable smoke coverage while keeping document gates existence-based. Review attestation is stored at scratch/review with frontmatter and versioned whole-file replacement.
