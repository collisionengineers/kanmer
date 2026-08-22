---
kind: proof-record
merged_sha: "4f785781e7f1993fbcde5e474640db509737c0bd"
environment: "merged main 4f785781; GitHub Actions windows-latest / Node v20.20.2; local Windows checkout"
verified_at: "2026-08-22T02:53:48.402Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T02:44:39Z"
    command: "PR #142 verify run 32546955237 / job 96967001211"
    cwd: "PR #142 merged stack"
    exit_code: 0
    result: PASS
    summary: "The full authoritative Windows verification rail passed in 2m46s, including GUI 355/355, MCP HTTP 61/61, scripts 80/80, typecheck, MCPB/plugin sync, smoke, protocol, discovery, skills, and AGENTS checks."
  - attempted_at: "2026-08-22T02:53:48.402Z"
    command: "npm run verify"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "The local merged-main rail retained two transient MCP HTTP failures: project-resolution child spawn ETIMEDOUT in http.test.mjs and TUNNEL_READINESS_TIMEOUT in readiness.test.mjs. No assertion was weakened."
  - attempted_at: "2026-08-22T02:53:48.402Z"
    command: "node --test packages/mcp-server/src/http.test.mjs packages/mcp-server/src/tunnels/readiness.test.mjs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Focused retry passed 12/12 after the retained full-rail failure."
  - attempted_at: "2026-08-22T02:53:48.402Z"
    command: "npm run mcpb:check; npm run plugin:check; node packages/mcp-server/src/smoke.mjs; npm run smoke:protocol; npm run test:scripts"
    cwd: ".worktrees/mcp-042"
    exit_code: 0
    result: PASS
    summary: "MCPB/plugin parity passed; MCP smoke 224/224, protocol 46/46, scripts 82/82, MCP typecheck, and diff-check all passed."
---
Merged-main proof for MCP-042: merge 4f785781e7f1993fbcde5e474640db509737c0bd contains the scoped implementation and the independent review-approved stack. The hosted authoritative rail is PASS; the transient local HTTP failure and focused retry are both retained exactly.
The committed plugin artifact is regenerated for the dispatch stack. Fresh standalone and committed plugin bytes match SHA-256 ae7a3c11f64a5941819813f83e5f52b29e2deb7ef8f7672bd7dd8eeaf4c49cde; mcpb:check and plugin:check pass.
