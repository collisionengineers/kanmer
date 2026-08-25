---
kind: proof-record
merged_sha: "645694f651561f5ad3bf0fc44ae88bee054fe8de"
environment: "Windows NT 10.0.26200.0 / Node v24.15.0 / detached exact-merge worktree .worktrees/verify-GUI-141"
verified_at: "2026-08-25T15:53:20.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T15:46:54.000Z"
    command: "npm ci"
    cwd: ".worktrees/verify-GUI-141"
    exit_code: 0
    result: PASS
    summary: "Clean locked dependency install completed; npm reported existing audit advisories without changing the lockfile."
  - attempted_at: "2026-08-25T15:47:09.000Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-GUI-141"
    exit_code: 0
    result: PASS
    summary: "Exact merge passed the complete repository gate: core 310/310, GUI 483/483, HTTP 107/107, scripts 116/116, typecheck, docs, MCP and protocol smokes, MCPB, skills, AGENTS, and plugin sync."
---

Source and deterministic verification pass at the exact GitHub merge SHA. Hosted PR checks and the independent exact-head review also passed. GUI-141 remains in Verifying because its acceptance boundary includes proving the installed Windows package can adopt the real distinct runtime alias/profile and serve a live ChatGPT request after the next release; this proof does not fabricate that external result.
