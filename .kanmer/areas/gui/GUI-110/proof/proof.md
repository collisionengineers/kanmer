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
    command: "npm run typecheck; npm run test -w @kanmer/gui"
    cwd: ".worktrees/gui-110"
    exit_code: 0
    result: PASS
    summary: "All-workspace typecheck passed; GUI tests passed (352/352 before the final stacked run), and the authoritative hosted stack passed 355/355."
---
Merged-main proof for GUI-110: merge 4f785781e7f1993fbcde5e474640db509737c0bd contains the scoped implementation and the independent review-approved stack. The hosted authoritative rail is PASS; the transient local HTTP failure and focused retry are both retained exactly.
The browser demo AppSettings fixture now carries dispatch: { providers: {} } without changing provider behavior. The exact typecheck regression is fixed and the full hosted stack is green.
